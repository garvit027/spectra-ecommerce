// server/routes/user.js
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
  <div style="background:#0f172a;padding:0;margin:0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:32px 0">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#0b1020;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);box-shadow:0 10px 30px rgba(0,0,0,.35)">
            <tr>
              <td style="padding:24px 28px;background:linear-gradient(90deg,#7c3aed,#06b6d4);color:#fff;font-family:Inter,Arial,sans-serif">
                <div style="font-weight:700;font-size:20px;letter-spacing:.4px">SPECTRA · Seller Review</div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px;color:#e2e8f0;font-family:Inter,Arial,sans-serif">
                <h2 style="margin:0 0 8px 0;color:#f8fafc;font-size:22px">New Seller Application</h2>
                <p style="margin:0 0 16px 0;color:#cbd5e1">A new seller has applied. Review details and take action below.</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 8px">
                  <tr>
                    <td style="width:180px;color:#94a3b8">Applicant Email</td>
                    <td style="color:#f1f5f9">${user.email}</td>
                  </tr>
                  <tr>
                    <td style="width:180px;color:#94a3b8">Business Name</td>
                    <td style="color:#f1f5f9">${businessName}</td>
                  </tr>
                  <tr>
                    <td style="width:180px;color:#94a3b8">Type</td>
                    <td style="color:#f1f5f9">${businessType}</td>
                  </tr>
                  <tr>
                    <td style="width:180px;color:#94a3b8">Phone</td>
                    <td style="color:#f1f5f9">${phone}</td>
                  </tr>
                  <tr>
                    <td style="width:180px;color:#94a3b8">Address</td>
                    <td style="color:#f1f5f9">${address}</td>
                  </tr>
                  <tr>
                    <td style="width:180px;color:#94a3b8">Tax ID</td>
                    <td style="color:#f1f5f9">${taxId || "-"}</td>
                  </tr>
                  <tr>
                    <td style="width:180px;color:#94a3b8;vertical-align:top">Description</td>
                    <td style="color:#f1f5f9">${description}</td>
                  </tr>
                </table>

                <div style="height:20px"></div>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
                  <tr>
                    <td>
                      <a href="${reviewPageLink}" style="display:inline-block;padding:12px 18px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">Open Review Page</a>
                    </td>
                    <td style="width:12px"></td>
                    <td>
                      <a href="${approveDirect}" style="display:inline-block;padding:12px 18px;background:#10b981;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Approve</a>
                    </td>
                    <td style="width:12px"></td>
                    <td>
                      <a href="${rejectDirect}" style="display:inline-block;padding:12px 18px;background:#ef4444;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Reject</a>
                    </td>
                  </tr>
                </table>

                <p style="margin-top:16px;color:#94a3b8;font-size:12px">One‑click Approve/Reject above will finalize immediately and notify the applicant.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 28px;background:#0a0f1d;color:#64748b;font-family:Inter,Arial,sans-serif;font-size:12px">
                © ${new Date().getFullYear()} Spectra. This link expires in 7 days.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
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