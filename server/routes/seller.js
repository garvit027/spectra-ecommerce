// server/routes/seller.js
import express from "express";
import twilio from "twilio";
import dotenv from "dotenv";
import crypto from "crypto";
import { protect } from "../middlewares/authMiddleware.js";
import User from "../models/User.js";
import nodemailer from "nodemailer";

dotenv.config();
const router = express.Router();

const {
  TWILIO_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE,
  FRONTEND_URL,
  EMAIL_USER,
  EMAIL_PASS,
  ADMIN_EMAIL,
  TEST_MODE,
} = process.env;

const client = (TWILIO_SID && TWILIO_AUTH_TOKEN)
  ? twilio(TWILIO_SID, TWILIO_AUTH_TOKEN)
  : null;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

// In-memory (demo)
const otpStore = {};       // { phone: { otp, expires } }
const verifiedPhones = {}; // { phone: expiresMs }

// -------------------- OTP --------------------
router.post("/send-mobile-otp", protect, async (req, res) => {
  try {
    const { phone } = req.body;
    // Expect 10-digit local number (e.g. India). Adjust to your need.
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid 10-digit phone number" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    if (TEST_MODE === "true") {
      console.log(`[TEST_MODE] OTP for ${phone}: ${otp}`);
      return res.json({ message: "OTP (test mode) generated" });
    }

    if (!client || !TWILIO_PHONE) {
      return res.status(500).json({ error: "SMS service not configured" });
    }

    await client.messages.create({
      body: `Your Spectra Seller OTP is ${otp}. It expires in 5 minutes.`,
      from: TWILIO_PHONE,
      to: `+91${phone}`, // change country code if needed
    });

    res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("send-mobile-otp error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/verify-mobile-otp", protect, (req, res) => {
  try {
    const { phone, otp } = req.body;
    const rec = otpStore[phone];
    if (!rec) return res.status(400).json({ error: "OTP not found" });
    if (Date.now() > rec.expires) {
      delete otpStore[phone];
      return res.status(400).json({ error: "OTP expired" });
    }
    if (rec.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });

    delete otpStore[phone];
    verifiedPhones[phone] = Date.now() + 15 * 60 * 1000;

    res.json({ verified: true, message: "Phone verified" });
  } catch (err) {
    console.error("verify-mobile-otp error:", err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

// -------------------- Apply --------------------
router.post("/apply", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessName, businessType, address, phone, taxId, description } = req.body;

    if (!businessName || !businessType || !address || !phone || !description) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    const expires = verifiedPhones[phone];
    if (!expires || Date.now() > expires) {
      return res.status(400).json({ error: "Phone not verified or verification expired" });
    }

    const approvalToken = crypto.randomBytes(32).toString("hex");
    const user = await User.findByIdAndUpdate(
      userId,
      {
        sellerStatus: "pending",
        isSeller: false,
        sellerApprovalToken: approvalToken,
        businessInfo: {
          businessName,
          businessType,
          address,
          phone,
          taxId,
          description,
          appliedAt: new Date(),
        },
      },
      { new: true }
    );

    // --- Email to Superuser (Admin) with Review Link ---
    const reviewLink = `${FRONTEND_URL}/admin/seller-review/${approvalToken}`;
    const adminHtml = `
      <div style="font-family: Inter, Arial, sans-serif;max-width:680px;margin:auto;">
        <h2>New Seller Application</h2>
        <p>A new seller application has been submitted.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td><b>Applicant</b></td><td>${user.name} (${user.email})</td></tr>
          <tr><td><b>Business Name</b></td><td>${businessName}</td></tr>
          <tr><td><b>Type</b></td><td>${businessType}</td></tr>
          <tr><td><b>Address</b></td><td>${address}</td></tr>
          <tr><td><b>Phone</b></td><td>${phone}</td></tr>
          <tr><td><b>Tax ID</b></td><td>${taxId || "N/A"}</td></tr>
          <tr><td><b>Description</b></td><td>${description}</td></tr>
        </table>
        <p style="margin-top:16px">Open the review page and choose Approve/Reject:</p>
        <p><a href="${reviewLink}" style="background:#7c3aed;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;">Open Review</a></p>
      </div>
    `;
    await transporter.sendMail({
      from: EMAIL_USER,
      to: ADMIN_EMAIL,
      subject: `New Seller Application: ${user.name}`,
      html: adminHtml,
    });

    // --- Acknowledgement email to applicant ---
    await transporter.sendMail({
      from: EMAIL_USER,
      to: user.email,
      subject: "We received your seller application",
      html: `
        <div style="font-family: Inter, Arial, sans-serif;max-width:680px;margin:auto;">
          <h2>Thanks, ${user.name}!</h2>
          <p>Your seller application is <b>under review</b>. We'll notify you after a decision is made.</p>
        </div>
      `,
    });

    res.json({ message: "Application submitted", user });
  } catch (err) {
    console.error("apply error:", err);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// -------------------- Admin Actions via Frontend Review --------------------
router.post("/approve", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

    const user = await User.findOneAndUpdate(
      { sellerApprovalToken: token, sellerStatus: "pending" },
      {
        isSeller: true,
        sellerStatus: "approved",
        "businessInfo.approvedAt": new Date(),
        $unset: { sellerApprovalToken: "" },
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "Application not found or already processed" });

    // Email to applicant
    await transporter.sendMail({
      from: EMAIL_USER,
      to: user.email,
      subject: "Your seller application has been approved 🎉",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:680px;margin:auto;">
          <h2>You're Verified!</h2>
          <p>Congratulations, ${user.name}! Your seller account is now verified and active.</p>
        </div>
      `,
    });

    res.json({ ok: true, user });
  } catch (err) {
    console.error("approve error:", err);
    res.status(500).json({ error: "Failed to approve application" });
  }
});

router.post("/reject", async (req, res) => {
  try {
    const { token, reason } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });
    const rejectionReason = (reason || "").trim();

    const user = await User.findOneAndUpdate(
      { sellerApprovalToken: token, sellerStatus: "pending" },
      {
        isSeller: false,
        sellerStatus: "rejected",
        $unset: { sellerApprovalToken: "" },
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "Application not found or already processed" });

    // Email to applicant
    await transporter.sendMail({
      from: EMAIL_USER,
      to: user.email,
      subject: "Your seller application decision",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:680px;margin:auto;">
          <h2>Application Update</h2>
          <p>Hi ${user.name},</p>
          <p>We regret to inform you that your seller application was not approved at this time.</p>
          ${
            rejectionReason
              ? `<p><b>Reason:</b> ${rejectionReason}</p>`
              : ""
          }
          <p>You may reply to this email if you have questions.</p>
        </div>
      `,
    });

    res.json({ ok: true, user });
  } catch (err) {
    console.error("reject error:", err);
    res.status(500).json({ error: "Failed to reject application" });
  }
});

export default router;