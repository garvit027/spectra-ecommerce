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
    if (!email || !/\S+@\S+\.\S+/.test(email)) { // Basic email validation
        return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    emailOtpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 }; // 5 min expiry

    await transporter.sendMail({
      from: `Spectra Commerce <${process.env.EMAIL_USER}>`, // Add sender name
      to: email,
      subject: "Your Spectra OTP Code",
      html: `<p>Your One-Time Password (OTP) for Spectra is <b>${otp}</b>. It is valid for 5 minutes.</p>`,
    });

    const existingUser = await User.findOne({ email }).lean(); // Use lean for read-only
    res.json({ message: "OTP sent successfully.", userExists: !!existingUser });
  } catch (err) {
    console.error("send-otp error:", err);
    res.status(500).json({ error: "Failed to send OTP. Please try again later." });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP are required." });
    }
    const record = emailOtpStore[email];

    if (!record) return res.status(400).json({ error: "OTP not found or expired. Please request a new one." });
    if (Date.now() > record.expires) {
      delete emailOtpStore[email];
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }
    if (record.otp !== otp) return res.status(400).json({ error: "Invalid OTP entered." });

    // OTP is correct, delete it
    delete emailOtpStore[email];

    let user = await User.findOne({ email }); // Find user
    if (user) {
      // User exists, log them in
      const token = signToken({ id: user._id });
      // Return only necessary user fields for security/privacy
      const userPayload = { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, isSeller: user.isSeller, sellerStatus: user.sellerStatus, address: user.address, contactNo: user.contactNo, age: user.age };
      return res.json({ message: "Login successful", userExists: true, user: userPayload, token });
    } else {
      // User does not exist, signal frontend to show signup form
      res.json({ message: "OTP verified, please complete signup.", userExists: false });
    }
  } catch (err) {
    console.error("verify-otp error:", err);
    res.status(500).json({ error: "Failed to verify OTP. Please try again." });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { name, contactNo, age, email } = req.body;
    // Server-side validation
    if (!name || !contactNo || !age || !email)
      return res.status(400).json({ error: "Name, Mobile Number, Age, and Email are required." });
    if (!/^\d{10}$/.test(contactNo))
      return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
     if (isNaN(parseInt(age, 10)) || parseInt(age, 10) <= 0 || parseInt(age, 10) > 120) {
        return res.status(400).json({ error: "Please enter a valid age." });
     }
     if (!/\S+@\S+\.\S+/.test(email)) {
         return res.status(400).json({ error: "Please enter a valid email address." });
     }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "An account with this email already exists." });

    const newUser = new User({ name, contactNo, age: parseInt(age, 10), email }); // Save age as number
    await newUser.save();

    const token = signToken({ id: newUser._id });

    // Return necessary fields
    const userPayload = { _id: newUser._id, name: newUser.name, email: newUser.email, isAdmin: newUser.isAdmin, isSeller: newUser.isSeller, sellerStatus: newUser.sellerStatus, address: newUser.address, contactNo: newUser.contactNo, age: newUser.age };
    res.status(201).json({ message: "Signup successful", user: userPayload, token }); // Use 201 for resource creation
  } catch (err) {
    console.error("signup error:", err);
    // Handle potential duplicate key error more gracefully (though checked above)
    if (err.code === 11000) {
        return res.status(400).json({ error: "Email already registered." });
    }
    res.status(500).json({ error: "Signup failed due to a server error." });
  }
});

/* ===================== PROFILE ===================== */
router.get("/me", protect, async (req, res) => {
 try {
    // req.user comes from the 'protect' middleware
    const user = await User.findById(req.user.id).select("-sellerApprovalToken"); // Exclude sensitive fields
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch(err){
     console.error("/me error:", err);
     res.status(500).json({ error: "Failed to fetch user profile." });
  }
});

// ✅ UPDATED THIS ROUTE
router.put("/update", protect, async (req, res) => {
  try {
    // ✅ 1. ADD 'address' to destructuring
    const { name, contactNo, age, address } = req.body;

    // Basic validation
    if (!name || !contactNo || !age) // Address is optional based on model
      return res.status(400).json({ error: "Name, Mobile Number, and Age are required." });
    if (!/^\d{10}$/.test(contactNo))
      return res.status(400).json({ error: "Invalid 10-digit mobile number." });
     if (isNaN(parseInt(age, 10)) || parseInt(age, 10) <= 0 || parseInt(age, 10) > 120) {
        return res.status(400).json({ error: "Please enter a valid age." });
     }

    // ✅ 2. ADD 'address' to the update object
    const updateFields = {
        name,
        contactNo,
        age: parseInt(age, 10),
        address: address || "" // Use provided address or default to empty string
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true } // Return the updated doc, run schema validators
    ).select("-sellerApprovalToken"); // Exclude sensitive token

    if (!user) {
        return res.status(404).json({ error: "User not found." });
    }

    // Return the updated user object (necessary fields only)
    const userPayload = { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, isSeller: user.isSeller, sellerStatus: user.sellerStatus, address: user.address, contactNo: user.contactNo, age: user.age };
    res.json({ message: "Profile updated successfully.", user: userPayload });

  } catch (err) {
    console.error("update profile error:", err);
     // Handle potential validation errors from Mongoose
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to update profile due to a server error." });
  }
});

/* ===================== SELLER APPLICATION FLOW ===================== */

// 1) Send mobile OTP
router.post("/seller/send-otp", protect, async (req, res) => { // ✅ Added 'protect' - user must be logged in
  try {
    const { phone } = req.body;
    // Validate E.164 format better if needed, e.g., using a library like 'google-libphonenumber'
    if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
        return res.status(400).json({ error: "Valid phone number (E.164 format, e.g., +91XXXXXXXXXX) is required." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    phoneOtpStore[phone] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    if (process.env.NODE_ENV === "development" || process.env.TEST_MODE === "true") {
      console.log(`🧪 [DEV/TEST_MODE] SMS OTP for ${phone}: ${otp}`);
      return res.json({ message: "OTP sent (check console in dev/test mode)." }); // Return early in dev/test
    }

    if (twilio && process.env.TWILIO_PHONE) {
      await twilio.messages.create({
        body: `Your Spectra seller verification OTP is ${otp}. It expires in 5 minutes.`,
        from: process.env.TWILIO_PHONE,
        to: phone, // Assuming phone includes country code now
      });
      res.json({ message: "OTP sent to your mobile." });
    } else {
       console.error("Twilio not configured or TWILIO_PHONE missing.");
      res.status(500).json({ error: "SMS service not configured." });
    }
  } catch (err) {
    console.error("seller/send-otp error:", err);
    // Provide a more specific error if Twilio fails
     if (err.code && err.message.includes('Twilio')) {
         return res.status(500).json({ error: `Failed to send SMS via Twilio: ${err.message}` });
     }
    res.status(500).json({ error: "Failed to send OTP. Please try again later." });
  }
});

// 2) Verify mobile OTP
router.post("/seller/verify-otp", protect, async (req, res) => { // ✅ Added 'protect'
  try {
    const { phone, otp } = req.body;
     if (!phone || !otp) {
        return res.status(400).json({ error: "Phone number and OTP are required." });
    }
    const record = phoneOtpStore[phone];

    if (!record) return res.status(400).json({ error: "OTP not found or expired. Please request a new one." });
    if (Date.now() > record.expires) {
      delete phoneOtpStore[phone];
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }
    if (record.otp !== otp) return res.status(400).json({ error: "Invalid OTP entered." });

    // OTP verified, clear it
    delete phoneOtpStore[phone];
    res.json({ message: "Phone number verified successfully." });
  } catch (err) {
    console.error("seller/verify-otp error:", err);
    res.status(500).json({ error: "Failed to verify OTP." });
  }
});

// 3) Submit seller application (requires login)
router.post("/seller/apply", protect, async (req, res) => {
  try {
    const { businessName, businessType, address, phone, taxId, description } = req.body;
    // Enhanced validation
    if (!businessName || !businessType || !address || !phone || !description)
      return res.status(400).json({ error: "Business Name, Type, Address, Phone, and Description are required." });
    // Add phone validation if desired (e.g., E.164)

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User profile not found." });
    // Prevent re-application if already approved or pending
    if (user.sellerStatus === 'approved') return res.status(400).json({ error: "You are already an approved seller."});
    if (user.sellerStatus === 'pending') return res.status(400).json({ error: "Your application is already pending review."});


    // --- Create/Update SellerApplication document ---
    let app = await SellerApplication.findOne({ userId: user._id });
    const reviewToken = uuidv4();
    const reviewTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

    const appData = {
        userId: user._id,
        email: user.email, // Denormalize email for easy access
        businessName,
        businessType,
        address, // Business address
        phone, // Business phone
        taxId,
        description,
        reviewToken,
        reviewTokenExpiresAt,
        status: 'pending', // Reset status on re-application
        createdAt: new Date(), // Update timestamp on re-application
        reviewedAt: null, // Clear previous review time
    };

    if (app) {
      // Update existing application record
      Object.assign(app, appData);
      await app.save();
    } else {
      // Create new application record
      app = await SellerApplication.create(appData);
    }

    // --- Update User document ---
    user.sellerStatus = "pending";
    user.isSeller = false; // Not a seller until approved
    // Store business info directly on user as well
    user.businessInfo = {
      businessName,
      businessType,
      address, // Business address
      phone, // Business phone
      taxId,
      description,
      appliedAt: app.createdAt, // Use consistent application time
      approvedAt: null, // Clear previous approval time
    };
    user.sellerApprovalToken = reviewToken; // Store the token on the user too (optional redundancy)
    await user.save();


    // --- Send Email to Admin ---
    const reviewPageLink = `${FRONTEND_URL}/admin/seller-review/${app.reviewToken}`;
    const approveDirect = `${API_BASE}/api/users/seller/approve-via-email/${app.reviewToken}`;
    const rejectDirect = `${API_BASE}/api/users/seller/reject-via-email/${app.reviewToken}`;

    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #5a2d82;">New Seller Application - Spectra</h2>
        <p>A new seller application requires your review:</p>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 5px;"><strong>Applicant:</strong> ${user.name} (${user.email})</li>
          <li style="margin-bottom: 5px;"><strong>Business Name:</strong> ${businessName}</li>
          <li style="margin-bottom: 5px;"><strong>Type:</strong> ${businessType}</li>
          <li style="margin-bottom: 5px;"><strong>Phone:</strong> ${phone}</li>
          <li style="margin-bottom: 5px;"><strong>Address:</strong> ${address}</li>
          <li style="margin-bottom: 5px;"><strong>Tax ID:</strong> ${taxId || "N/A"}</li>
          <li style="margin-bottom: 15px;"><strong>Description:</strong> ${description}</li>
        </ul>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <h3 style="color: #5a2d82;">Actions</h3>
        <p style="margin-bottom: 20px;">
          <a href="${reviewPageLink}" style="display: inline-block; padding: 10px 18px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px; font-size: 14px;">Open Review Page</a>
        </p>
         <p>Or use quick actions (less secure):</p>
        <p>
          <a href="${approveDirect}" style="display: inline-block; padding: 8px 15px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px; font-size: 13px;">Approve</a>
          <a href="${rejectDirect}" style="display: inline-block; padding: 8px 15px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; font-size: 13px;">Reject</a>
        </p>
        <p style="font-size: 0.8em; color: #6c757d; margin-top: 20px;">Review link and quick actions expire in 7 days.</p>
    </div>
    `;

    // Ensure ADMIN_EMAIL is configured
    if (!process.env.ADMIN_EMAIL) {
        console.error("ADMIN_EMAIL not set in .env - Cannot send application notification.");
        // Decide if you still want to return success to the user
        // return res.status(500).json({ error: "Admin notification email not configured." });
    } else {
        await transporter.sendMail({
          from: `Spectra Admin <${process.env.EMAIL_USER}>`,
          to: process.env.ADMIN_EMAIL,
          subject: `Spectra Commerce: New Seller Application from ${user.email}`,
          html,
        });
    }

    // Return the updated user object (relevant fields)
     const userPayload = { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, isSeller: user.isSeller, sellerStatus: user.sellerStatus, address: user.address, contactNo: user.contactNo, age: user.age, businessInfo: user.businessInfo };
    res.json({ message: "Application submitted successfully. We will review it shortly.", user: userPayload });

  } catch (err) {
    console.error("seller/apply error:", err);
    res.status(500).json({ error: "Failed to submit application due to a server error." });
  }
});

/* 4) Public: load application by token (used by AdminSellerReview.jsx) */
router.get("/seller/review/:token", async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: "Review token is missing." });

    const app = await SellerApplication.findOne({ reviewToken: token }).populate('userId', 'name email'); // Populate user details
    if (!app) return res.status(404).json({ error: "Invalid or expired review link." });

    // Check expiry explicitly
    if (app.reviewTokenExpiresAt < new Date()) {
         // Optionally clean up expired token here if desired
         // app.reviewToken = null;
         // app.reviewTokenExpiresAt = null;
         // await app.save();
        return res.status(400).json({ error: "This review link has expired." });
    }

    // Return the application details, including populated user info
    res.json(app);
  } catch (err) {
    console.error("seller/review GET error:", err);
    res.status(500).json({ error: "Failed to load application details." });
  }
});

/* 5) Admin UI: Approve (Requires Admin role) */
router.post("/seller/approve", protectAdmin, async (req, res) => { // ✅ Changed to protectAdmin
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Review token is required." });

    const app = await SellerApplication.findOne({ reviewToken: token });
    if (!app) return res.status(404).json({ error: "Application not found or token invalid." });
    if (app.reviewTokenExpiresAt < new Date()) return res.status(400).json({ error: "Review link expired." });
    if (app.status !== "pending") return res.status(400).json({ error: `Application is already ${app.status}.` });

    const user = await User.findById(app.userId);
    if (!user) {
        // Handle case where user might have been deleted
        app.status = 'error'; // Mark application as errored
        await app.save();
        return res.status(404).json({ error: "Applicant user not found." });
    }

    // --- Update Application ---
    app.status = "approved";
    app.reviewedAt = new Date();
    app.reviewToken = null; // Invalidate token after use
    app.reviewTokenExpiresAt = null;
    await app.save();

    // --- Update User ---
    user.isSeller = true;
    user.sellerStatus = "approved";
    // Ensure businessInfo is updated from the application record
    user.businessInfo = {
      businessName: app.businessName,
      businessType: app.businessType,
      address: app.address,
      phone: app.phone,
      taxId: app.taxId,
      description: app.description,
      appliedAt: app.createdAt,
      approvedAt: app.reviewedAt,
    };
    user.sellerApprovalToken = null; // Clear token from user too
    await user.save();

    // --- Send Email to Applicant ---
    await transporter.sendMail({
      from: `Spectra Support <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Congratulations! Your Spectra Seller Application is Approved",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>🎉 Application Approved!</h2>
            <p>Hi ${user.name},</p>
            <p>We're excited to let you know that your seller application for Spectra Commerce has been approved!</p>
            <p>You can now access your <a href="${FRONTEND_URL}/seller/dashboard" style="color: #5a2d82; text-decoration: none; font-weight: bold;">Seller Dashboard</a> to manage your products and orders.</p>
            <p>Welcome aboard!</p>
            <p>Best regards,<br/>The Spectra Team</p>
        </div>`,
    });

    res.json({ message: "Seller approved successfully." });
  } catch (err) {
    console.error("seller/approve error:", err);
    res.status(500).json({ error: "Failed to approve seller due to a server error." });
  }
});

/* 6) Admin UI: Reject (Requires Admin role) */
router.post("/seller/reject", protectAdmin, async (req, res) => { // ✅ Changed to protectAdmin
  try {
    const { token, reason } = req.body;
     if (!token) return res.status(400).json({ error: "Review token is required." });
     if (!reason) return res.status(400).json({ error: "A reason for rejection is required." });

    const app = await SellerApplication.findOne({ reviewToken: token });
    if (!app) return res.status(404).json({ error: "Application not found or token invalid." });
    if (app.reviewTokenExpiresAt < new Date()) return res.status(400).json({ error: "Review link expired." });
    if (app.status !== "pending") return res.status(400).json({ error: `Application is already ${app.status}.` });

    const user = await User.findById(app.userId);
     if (!user) {
        app.status = 'error';
        await app.save();
        return res.status(404).json({ error: "Applicant user not found." });
    }

    // --- Update Application ---
    app.status = "rejected";
    app.reviewedAt = new Date();
    app.rejectionReason = reason; // Store the reason
    app.reviewToken = null;
    app.reviewTokenExpiresAt = null;
    await app.save();

    // --- Update User ---
    user.isSeller = false;
    user.sellerStatus = "rejected";
    // Optionally clear businessInfo on rejection, or keep it for history
    // user.businessInfo = undefined;
    user.sellerApprovalToken = null;
    await user.save();

    // --- Send Email to Applicant ---
    await transporter.sendMail({
       from: `Spectra Support <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Update on Your Spectra Seller Application",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Seller Application Update</h2>
            <p>Hi ${user.name},</p>
            <p>We have reviewed your seller application and unfortunately, we are unable to approve it at this time.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>Thank you for your interest in selling on Spectra.</p>
            <p>Best regards,<br/>The Spectra Team</p>
        </div>`,
    });

    res.json({ message: "Seller rejected successfully." });
  } catch (err) {
    console.error("seller/reject error:", err);
    res.status(500).json({ error: "Failed to reject seller due to a server error." });
  }
});

/* 7) One‑click approve via email (GET) - Less secure, use with caution */
router.get("/seller/approve-via-email/:token", async (req, res) => {
  // Note: This endpoint is public and less secure than using the admin UI with protectAdmin.
  // Consider adding extra checks or using short-lived tokens if keeping this.
  try {
    const { token } = req.params;
    const app = await SellerApplication.findOne({ reviewToken: token });

    // Consolidate checks
    if (!app || app.reviewTokenExpiresAt < new Date()) {
        return res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Invalid or expired link.`);
    }
    if (app.status !== "pending") {
        return res.redirect(`${FRONTEND_URL}/seller-application-status?status=info&message=Application already reviewed (${app.status}).`);
    }

    const user = await User.findById(app.userId);
    if (!user) {
        app.status = 'error'; await app.save(); // Mark app as errored
        return res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Applicant user not found.`);
    }

    // --- Perform Approval Logic (same as POST /approve) ---
    app.status = "approved";
    app.reviewedAt = new Date();
    app.reviewToken = null;
    app.reviewTokenExpiresAt = null;
    await app.save();

    user.isSeller = true;
    user.sellerStatus = "approved";
    user.businessInfo = {
      businessName: app.businessName, businessType: app.businessType, address: app.address,
      phone: app.phone, taxId: app.taxId, description: app.description,
      appliedAt: app.createdAt, approvedAt: app.reviewedAt,
    };
    user.sellerApprovalToken = null;
    await user.save();

    // --- Send Email ---
    await transporter.sendMail({
      from: `Spectra Support <${process.env.EMAIL_USER}>`, to: user.email,
      subject: "Congratulations! Your Spectra Seller Application is Approved",
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;"><h2>🎉 Application Approved!</h2><p>Hi ${user.name},</p><p>We're excited to let you know that your seller application for Spectra Commerce has been approved!</p><p>You can now access your <a href="${FRONTEND_URL}/seller/dashboard" style="color: #5a2d82; text-decoration: none; font-weight: bold;">Seller Dashboard</a>.</p><p>Welcome aboard!</p><p>Best regards,<br/>The Spectra Team</p></div>`,
    });

    // Redirect to a success page specifically for email approval if needed
    return res.redirect(`${FRONTEND_URL}/verified-success?source=email`);

  } catch (err) {
    console.error("approve-via-email error:", err);
    res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Server error during approval.`);
  }
});

/* 8) One‑click reject via email (GET) - Less secure */
router.get("/seller/reject-via-email/:token", async (req, res) => {
  // Similar security considerations as approve-via-email
  try {
    const { token } = req.params;
    const app = await SellerApplication.findOne({ reviewToken: token });

     if (!app || app.reviewTokenExpiresAt < new Date()) {
        return res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Invalid or expired link.`);
    }
    if (app.status !== "pending") {
        return res.redirect(`${FRONTEND_URL}/seller-application-status?status=info&message=Application already reviewed (${app.status}).`);
    }

    const user = await User.findById(app.userId);
     if (!user) {
        app.status = 'error'; await app.save();
        return res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Applicant user not found.`);
    }

    // --- Perform Rejection Logic ---
    app.status = "rejected";
    app.reviewedAt = new Date();
    // No reason possible via GET link, maybe set a default one
    app.rejectionReason = "Rejected via email link.";
    app.reviewToken = null;
    app.reviewTokenExpiresAt = null;
    await app.save();

    user.isSeller = false;
    user.sellerStatus = "rejected";
    user.sellerApprovalToken = null;
    await user.save();

    // --- Send Email ---
    await transporter.sendMail({
      from: `Spectra Support <${process.env.EMAIL_USER}>`, to: user.email,
      subject: "Update on Your Spectra Seller Application",
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;"><h2>Seller Application Update</h2><p>Hi ${user.name},</p><p>We have reviewed your seller application and unfortunately, we are unable to approve it at this time.</p><p>Thank you for your interest.</p><p>Best regards,<br/>The Spectra Team</p></div>`,
    });

    // Redirect to a specific rejection status page
    return res.redirect(`${FRONTEND_URL}/rejected-status?source=email`);

  } catch (err) {
    console.error("reject-via-email error:", err);
    res.redirect(`${FRONTEND_URL}/seller-application-status?status=error&message=Server error during rejection.`);
  }
});


export default router;
