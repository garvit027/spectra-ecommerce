import express from "express";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const otpStore = {}; // { email: { otp, expires } }

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Send OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
    });

    const existingUser = await User.findOne({ email });
    res.json({ message: "OTP sent successfully", userExists: !!existingUser });
  } catch (err) {
    console.error("❌ Send OTP error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = otpStore[email];
    if (!record) return res.status(400).json({ error: "OTP not found" });

    if (Date.now() > record.expires) {
      delete otpStore[email];
      return res.status(400).json({ error: "OTP expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    delete otpStore[email];
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      const token = generateToken(existingUser._id);
      return res.json({
        message: "OTP verified",
        userExists: true,
        user: existingUser,
        token,
      });
    } else {
      return res.json({ message: "OTP verified", userExists: false });
    }
  } catch (err) {
    console.error("❌ Verify OTP error:", err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, contactNo, age, email } = req.body;
    if (!name || !contactNo || !age || !email) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });

    const newUser = new User({ name, contactNo, age, email, role: "user" });
    await newUser.save();

    const token = generateToken(newUser._id);

    res.json({ message: "Signup successful", user: newUser, token });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

export default router;