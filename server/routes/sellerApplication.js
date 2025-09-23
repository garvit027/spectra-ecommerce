const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// In-memory OTP store (use DB or Redis in prod)
const otpStore = {};

// Helper to send OTP via SMS (fake function, replace with real SMS API)
const sendOtpSms = (mobile, otp) => {
  console.log(`Sending OTP ${otp} to mobile ${mobile}`);
  // TODO: Integrate with SMS provider like Twilio or MSG91
};

// Email transporter config (Gmail example)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SUPERUSER_EMAIL,
    pass: process.env.SUPERUSER_EMAIL_PASSWORD,
  },
});

// 1. Send OTP to mobile
router.post("/send-otp", (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ error: "Mobile number required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[mobile] = otp;

  sendOtpSms(mobile, otp);
  res.json({ message: "OTP sent successfully" });
});

// 2. Verify OTP
router.post("/verify-otp", (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp)
    return res.status(400).json({ error: "Mobile and OTP required" });

  if (otpStore[mobile] === otp) {
    delete otpStore[mobile];
    res.json({ message: "OTP verified" });
  } else {
    res.status(400).json({ error: "Invalid OTP" });
  }
});

// 3. Apply as seller (after OTP verified)
router.post("/apply-seller", (req, res) => {
  const {
    userId, // user applying
    organisationName,
    location,
    mobile,
    gstin,
    workspacePics, // array of image URLs or base64 strings
  } = req.body;

  if (!userId || !organisationName || !location || !mobile)
    return res.status(400).json({ error: "Missing required fields" });

  // TODO: Save this application data to DB (MongoDB, Postgres, etc.)

  // Send email to superuser for approval
  const mailOptions = {
    from: process.env.SUPERUSER_EMAIL,
    to: process.env.SUPERUSER_EMAIL,
    subject: "New Seller Application",
    text: `
      New seller application:
      User ID: ${userId}
      Organisation: ${organisationName}
      Location: ${location}
      Mobile: ${mobile}
      GSTIN: ${gstin || "N/A"}
      Workspace Pictures: ${workspacePics?.length || 0} attached.
      Please review and approve.
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Email send failed", error);
      return res.status(500).json({ error: "Failed to notify admin" });
    }
    res.json({ message: "Application sent for approval" });
  });
});

module.exports = router;