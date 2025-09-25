import express from "express";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import twilioPkg from "twilio";
import User from "../models/User.js";
import SellerApplication from "../models/SellerApplication.js";
import { protect, protectSeller, protectAdmin } from "../middlewares/authMiddleware.js";

dotenv.config();
const router = express.Router();

/* ----------------------- CONFIG ----------------------- */
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const API_BASE =
  process.env.BASE_URL || `http://localhost:${process.env.PORT || 8080}`;

/* ----------------------- EMAIL (Gmail) ----------------------- */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});
transporter.verify((err) => {
  if (err) console.error("❌ Email transporter verify failed:", err);
  else console.log("✅ Email transporter ready");
});

/* ----------------------- TWILIO (SMS) ----------------------- */
const twilio =
  process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilioPkg(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

/* ----------------------- OTP STORES ----------------------- */
const emailOtpStore = {};
const phoneOtpStore = {};

/* ----------------------- AUTH HELPERS ----------------------- */
const signToken = (payload, exp = "7d") =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: exp });

/* ===================== EMAIL OTP LOGIN ===================== */
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    emailOtpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Spectra OTP Code",
      html: `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`,
    });

    const existingUser = await User.findOne({ email });
    res.json({ message: "OTP sent", userExists: !!existingUser });
  } catch (err) {
    console.error("send-otp error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = emailOtpStore[email];
    if (!record) return res.status(400).json({ error: "OTP not found" });
    if (Date.now() > record.expires) {
      delete emailOtpStore[email];
      return res.status(400).json({ error: "OTP expired" });
    }
    if (record.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });

    delete emailOtpStore[email];

    let user = await User.findOne({ email });
    if (user) {
      const token = signToken({ id: user._id });
      return res.json({ message: "Login successful", userExists: true, user, token });
    }
    res.json({ message: "OTP verified", userExists: false });
  } catch (err) {
    console.error("verify-otp error:", err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { name, contactNo, age, email } = req.body;
    if (!name || !contactNo || !age || !email)
      return res.status(400).json({ error: "All fields are required" });
    if (!/^\d{10}$/.test(contactNo))
      return res.status(400).json({ error: "Invalid mobile number" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });

    const newUser = new User({ name, contactNo, age, email });
    await newUser.save();
    const token = signToken({ id: newUser._id });

    res.json({ message: "Signup successful", user: newUser, token });
  } catch (err) {
    console.error("signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

/* ===================== PROFILE ===================== */
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

router.put("/update", protect, async (req, res) => {
  try {
    const { name, contactNo, age } = req.body;
    if (!name || !contactNo || !age)
      return res.status(400).json({ error: "All fields are required" });
    if (!/^\d{10}$/.test(contactNo))
      return res.status(400).json({ error: "Invalid mobile number" });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, contactNo, age },
      { new: true }
    );
    res.json({ user });
  } catch (err) {
    console.error("update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/* ===================== SELLER APPLICATION FLOW ===================== */

// 1) Send mobile OTP
router.post("/seller/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    phoneOtpStore[phone] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    if (process.env.TEST_MODE === "true") {
      console.log(`🧪 [TEST_MODE] SMS OTP for ${phone}: ${otp}`);
      res.json({ message: "OTP sent" });
    } else if (twilio) {
      await twilio.messages.create({
        body: `Your Spectra seller verification OTP is ${otp}. It expires in 5 minutes.`,
        from: process.env.TWILIO_PHONE,
        to: `+91${phone}`,
      });
      res.json({ message: "OTP sent" });
    } else {
      res.status(500).json({ error: "Twilio not configured" });
    }
  } catch (err) {
    console.error("seller/send-otp error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// 2) Verify mobile OTP
router.post("/seller/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const record = phoneOtpStore[phone];
    if (!record) return res.status(400).json({ error: "OTP not found" });
    if (Date.now() > record.expires) {
      delete phoneOtpStore[phone];
      return res.status(400).json({ error: "OTP expired" });
    }
    if (record.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });

    delete phoneOtpStore[phone];
    res.json({ message: "Phone verified" });
  } catch (err) {
    console.error("seller/verify-otp error:", err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

// 3) Submit seller application (requires login)
router.post("/seller/apply", protect, async (req, res) => {
  try {
    const { businessName, businessType, address, phone, taxId, description } = req.body;
    if (!businessName || !businessType || !address || !phone || !description)
      return res.status(400).json({ error: "All required fields must be provided" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.sellerStatus = "pending";
    user.isSeller = false;
    user.businessInfo = {
      businessName,
      businessType,
      address,
      phone,
      taxId,
      description,
      appliedAt: new Date(),
    };
    await user.save();

    let app = await SellerApplication.findOne({ userId: user._id, status: "pending" });
    const reviewToken = uuidv4();
    const reviewTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (app) {
      Object.assign(app, {
        businessName,
        businessType,
        address,
        phone,
        taxId,
        description,
        reviewToken,
        reviewTokenExpiresAt,
        createdAt: new Date(),
      });
      await app.save();
    } else {
      app = await SellerApplication.create({
        userId: user._id,
        email: user.email,
        businessName,
        businessType,
        address,
        phone,
        taxId,
        description,
        reviewToken,
        reviewTokenExpiresAt,
      });
    }

    const reviewPageLink = `${FRONTEND_URL}/admin/seller-review/${app.reviewToken}`;
    const approveDirect = `${API_BASE}/api/users/seller/approve-via-email/${app.reviewToken}`;
    const rejectDirect = `${API_BASE}/api/users/seller/reject-via-email/${app.reviewToken}`;

    const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>New Seller Application for Spectra</h2>
    <p>A new seller has applied. Please review their details below.</p>
    <ul>
      <li><strong>Applicant Email:</strong> ${user.email}</li>
      <li><strong>Business Name:</strong> ${businessName}</li>
      <li><strong>Business Type:</strong> ${businessType}</li>
      <li><strong>Phone:</strong> ${phone}</li>
      <li><strong>Address:</strong> ${address}</li>
      <li><strong>Tax ID:</strong> ${taxId || "N/A"}</li>
      <li><strong>Description:</strong> ${description}</li>
    </ul>
    <h3>Actions</h3>
    <p>
      <a href="${reviewPageLink}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">Open Review Page</a>
      <a href="${approveDirect}" style="padding: 10px 15px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">Approve</a>
      <a href="${rejectDirect}" style="padding: 10px 15px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Reject</a>
    </p>
    <p style="font-size: 0.8em; color: #6c757d;">This link expires in 7 days.</p>
  </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "Spectra · New Seller Application",
      html,
    });

    res.json({ message: "Application submitted. Awaiting review." });
  } catch (err) {
    console.error("seller/apply error:", err);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

/* 4) Public: load application by token (used by AdminSellerReview.jsx) */
router.get("/seller/review/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const app = await SellerApplication.findOne({ reviewToken: token });
    if (!app) return res.status(404).json({ error: "Invalid or expired link" });
    if (app.reviewTokenExpiresAt < new Date())
      return res.status(400).json({ error: "Review link expired" });

    res.json(app);
  } catch (err) {
    console.error("seller/review GET error:", err);
    res.status(500).json({ error: "Failed to load application" });
  }
});

/* 5) Admin UI: Approve */
router.post("/seller/approve", async (req, res) => {
  try {
    const { token } = req.body;
    const app = await SellerApplication.findOne({ reviewToken: token });
    if (!app) return res.status(404).json({ error: "Invalid or expired token" });
    if (app.status !== "pending") return res.status(400).json({ error: `Already ${app.status}` });

    const user = await User.findById(app.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    app.status = "approved";
    app.reviewedAt = new Date();
    await app.save();

    user.isSeller = true;
    user.sellerStatus = "approved";
    user.businessInfo = {
      businessName: app.businessName,
      businessType: app.businessType,
      address: app.address,
      phone: app.phone,
      taxId: app.taxId,
      description: app.description,
      appliedAt: app.createdAt,
      approvedAt: new Date(),
    };
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Spectra – Seller Application Approved",
      html: `<p>🎉 Congrats! Your seller application has been approved. You now have access to the seller dashboard.</p>`,
    });

    res.json({ message: "Seller approved successfully" });
  } catch (err) {
    console.error("seller/approve error:", err);
    res.status(500).json({ error: "Failed to approve seller" });
  }
});

/* 6) Admin UI: Reject */
router.post("/seller/reject", async (req, res) => {
  try {
    const { token, reason } = req.body;
    const app = await SellerApplication.findOne({ reviewToken: token });
    if (!app) return res.status(404).json({ error: "Invalid or expired token" });
    if (app.status !== "pending") return res.status(400).json({ error: `Already ${app.status}` });

    const user = await User.findById(app.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    app.status = "rejected";
    app.reviewedAt = new Date();
    await app.save();

    user.isSeller = false;
    user.sellerStatus = "rejected";
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Spectra – Seller Application Rejected",
      html: `<p>We’re sorry — your seller application has been rejected.</p><p><b>Reason:</b> ${reason || "No reason provided"}</p>`,
    });

    res.json({ message: "Seller rejected successfully" });
  } catch (err) {
    console.error("seller/reject error:", err);
    res.status(500).json({ error: "Failed to reject seller" });
  }
});

/* 7) One‑click approve via email (GET) */
router.get("/seller/approve-via-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const app = await SellerApplication.findOne({ reviewToken: token });
    if (!app) return res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Invalid or expired link`);
    if (app.reviewTokenExpiresAt < new Date())
      return res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Link expired`);
    if (app.status !== "pending")
      return res.redirect(`${FRONTEND_URL}/seller-application-status?status=info&message=Already ${app.status}`);

    const user = await User.findById(app.userId);
    if (!user) return res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=User not found`);

    app.status = "approved";
    app.reviewedAt = new Date();
    await app.save();

    user.isSeller = true;
    user.sellerStatus = "approved";
    user.businessInfo = {
      businessName: app.businessName,
      businessType: app.businessType,
      address: app.address,
      phone: app.phone,
      taxId: app.taxId,
      description: app.description,
      appliedAt: app.createdAt,
      approvedAt: new Date(),
    };
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Spectra – Seller Application Approved",
      html: `<p>🎉 Congrats! Your seller application has been approved. You now have access to the seller dashboard.</p>`,
    });

    return res.redirect(`${FRONTEND_URL}/verified-success`);
  } catch (err) {
    console.error("approve-via-email error:", err);
    res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Failed to approve application`);
  }
});

/* 8) One‑click reject via email (GET) */
router.get("/seller/reject-via-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const app = await SellerApplication.findOne({ reviewToken: token });
    if (!app) return res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Invalid or expired link`);
    if (app.reviewTokenExpiresAt < new Date())
      return res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Link expired`);
    if (app.status !== "pending")
      return res.redirect(`${FRONTEND_URL}/seller-application-status?status=info&message=Already ${app.status}`);

    const user = await User.findById(app.userId);
    if (!user) return res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=User not found`);

    app.status = "rejected";
    app.reviewedAt = new Date();
    await app.save();

    user.isSeller = false;
    user.sellerStatus = "rejected";
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Spectra – Seller Application Rejected",
      html: `<p>We’re sorry — your seller application has been rejected.</p>`,
    });

    return res.redirect(`${FRONTEND_URL}/rejected-status`);
  } catch (err) {
    console.error("reject-via-email error:", err);
    res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Failed to reject application`);
  }
});

export default router;