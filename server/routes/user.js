import express from "express";
import transporter from "../utils/email.js";
import { getEmailTemplate } from "../utils/emailTemplate.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import { protect } from "../middlewares/authMiddleware.js";
import { sendAdminDashboard } from "../utils/adminDashboard.js";

dotenv.config();
const router = express.Router();

/* ----------------------- CONFIG ----------------------- */
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const API_BASE =
  process.env.BASE_URL || `http://localhost:${process.env.PORT || 8080}`;

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

    console.log(`[OTP DEBUG] OTP for ${email} is: ${otp}`);

    try {
      const content = `
        <p>Your One-Time Password (OTP) for Spectra Commerce is below:</p>
        <div class="otp-box">${otp}</div>
        <p>It is valid for 5 minutes. Please do not share this code with anyone.</p>
      `;
      await transporter.sendMail({
        from: `Spectra Commerce <${process.env.EMAIL_USER}>`, // Add sender name
        to: email,
        subject: "Your Spectra OTP Code",
        html: getEmailTemplate("Your Login OTP", content),
      });
    } catch (mailErr) {
      console.warn(`Could not send mail, but OTP was generated: ${otp}. Error: ${mailErr.message}`);
    }

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

    const isTestBypass = process.env.TEST_MODE === "true" && otp === "123456";

    if (!isTestBypass) {
      if (!record) return res.status(400).json({ error: "OTP not found or expired. Please request a new one." });
      if (Date.now() > record.expires) {
        delete emailOtpStore[email];
        return res.status(400).json({ error: "OTP expired. Please request a new one." });
      }
      if (record.otp !== otp) return res.status(400).json({ error: "Invalid OTP entered." });
    }

    // OTP is correct, delete it
    if (record) {
      delete emailOtpStore[email];
    }

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

    const isAdmin = email.toLowerCase() === (process.env.ADMIN_EMAIL || "").toLowerCase();
    const newUser = new User({ name, contactNo, age: parseInt(age, 10), email, isAdmin }); // Save age as number
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


/* ===================== VACATION MODE ===================== */
router.patch("/vacation", protect, async (req, res) => {
  try {
    const { onVacation } = req.body;
    if (typeof onVacation !== "boolean") {
      return res.status(400).json({ error: "onVacation must be a boolean." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { onVacation },
      { new: true }
    ).select("-sellerApprovalToken");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: `Vacation mode ${onVacation ? 'enabled' : 'disabled'}`, onVacation: user.onVacation });
  } catch (err) {
    console.error("vacation toggle error:", err);
    res.status(500).json({ error: "Failed to toggle vacation mode." });
  }
});

/* ===================== SELLER APPLICATION ===================== */
router.post("/apply-seller", protect, async (req, res) => {
  try {
    const { businessName, businessType, address, phone, taxId, description } = req.body;

    if (!businessName || !businessType || !address || !phone || !description) {
      return res.status(400).json({ error: "Please fill all required business fields." });
    }

    const token = uuidv4();
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        sellerStatus: "pending",
        sellerApprovalToken: token,
        sellerRejectionReason: "",
        businessInfo: {
          businessName,
          businessType,
          address,
          phone,
          taxId: taxId || "",
          description,
          appliedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found." });

    const reviewLink = `${FRONTEND_URL}/admin/seller-review/${token}`;
    console.log(`[SELLER APPLICATION] New application from ${user.email}. Review link: ${reviewLink}`);

    // Socket.io: notify admin of new seller application
    const io = req.app.get("io");
    if (io) io.emit("seller_application", { userId: user._id, businessName, email: user.email });

    // Send email to admin
    try {
      if (process.env.EMAIL_USER && process.env.ADMIN_EMAIL) {
        const content = `
          <p><strong>Applicant:</strong> ${user.name} (${user.email})</p>
          <p><strong>Business Name:</strong> ${businessName}</p>
          <p><strong>Type:</strong> ${businessType}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Address:</strong> ${address}</p>
          <p><strong>Tax ID:</strong> ${taxId || "N/A"}</p>
          <p><strong>Description:</strong> ${description}</p>
          <p><a href="${reviewLink}" class="btn">Review Application</a></p>
        `;
        await transporter.sendMail({
          from: `Spectra Commerce <${process.env.EMAIL_USER}>`,
          to: process.env.ADMIN_EMAIL,
          subject: `New Seller Application: ${businessName}`,
          html: getEmailTemplate("New Seller Application", content),
        });
      }
    } catch (mailErr) {
      console.error("Failed to send admin notification email:", mailErr.message);
    }

    const userPayload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isSeller: user.isSeller,
      sellerStatus: user.sellerStatus,
      address: user.address,
      contactNo: user.contactNo,
      age: user.age,
    };

    res.json({ message: "Application submitted successfully.", user: userPayload });
  } catch (err) {
    console.error("apply-seller error:", err);
    res.status(500).json({ error: "Failed to submit application." });
  }
});

// GET review details by token
router.get("/seller/review/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ sellerApprovalToken: token, sellerStatus: "pending" });
    if (!user) {
      return res.status(404).json({ error: "Application not found or already processed." });
    }

    res.json({
      email: user.email,
      businessName: user.businessInfo?.businessName || "",
      businessType: user.businessInfo?.businessType || "",
      phone: user.businessInfo?.phone || "",
      address: user.businessInfo?.address || "",
      taxId: user.businessInfo?.taxId || "",
      description: user.businessInfo?.description || "",
    });
  } catch (err) {
    console.error("seller/review error:", err);
    res.status(500).json({ error: "Failed to load application details." });
  }
});

// Approve seller application by token
router.post("/seller/approve", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required." });

    const user = await User.findOneAndUpdate(
      { sellerApprovalToken: token, sellerStatus: "pending" },
      {
        isSeller: true,
        sellerStatus: "approved",
        "businessInfo.approvedAt": new Date(),
        sellerApprovalToken: null,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Application not found or already processed." });
    }

    // Socket.io: notify the user their application was approved
    const io = req.app.get("io");
    if (io) io.emit("seller_approved", { userId: user._id });

    // Admin dashboard email
    sendAdminDashboard(
      `Seller Approved: ${user.businessInfo?.businessName}`,
      "Seller Application Approved",
      `<p>You approved the seller application for <strong>${user.name}</strong> (${user.email}).</p>
       <p>Business: <strong>${user.businessInfo?.businessName}</strong></p>`
    );

    // Email to applicant
    try {
      if (process.env.EMAIL_USER) {
        const content = `
          <p>Your seller account for <strong>${user.businessInfo?.businessName}</strong> has been verified.</p>
          <p>You can now access your Seller Dashboard and start listing products.</p>
          <p><a href="${FRONTEND_URL}/seller/dashboard" class="btn">Go to Dashboard</a></p>
        `;
        await transporter.sendMail({
          from: `Spectra Commerce <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "Your Spectra Seller Application has been Approved! 🎉",
          html: getEmailTemplate(`Congratulations ${user.name}!`, content),
        });
      }
    } catch (mailErr) {
      console.error("Failed to send approval email:", mailErr.message);
    }

    res.json({ message: "Seller approved successfully." });
  } catch (err) {
    console.error("seller/approve error:", err);
    res.status(500).json({ error: "Failed to approve seller." });
  }
});

// Reject seller application by token
router.post("/seller/reject", async (req, res) => {
  try {
    const { token, reason } = req.body;
    if (!token) return res.status(400).json({ error: "Token required." });

    const user = await User.findOneAndUpdate(
      { sellerApprovalToken: token, sellerStatus: "pending" },
      {
        isSeller: false,
        sellerStatus: "rejected",
        sellerRejectionReason: reason || "No reason provided",
        sellerApprovalToken: null,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Application not found or already processed." });
    }

    // Socket.io: notify the user their application was rejected
    const io = req.app.get("io");
    if (io) io.emit("seller_rejected", { userId: user._id, reason });

    // Email to applicant
    try {
      if (process.env.EMAIL_USER) {
        const content = `
          <p>Hello ${user.name},</p>
          <p>Thank you for your interest in selling on Spectra. Unfortunately, your application has not been approved at this time.</p>
          <p style="background-color: #fee2e2; padding: 15px; border-radius: 8px; color: #991b1b; font-weight: 500;">
            <strong>Reason:</strong> ${reason || "No details provided"}
          </p>
        `;
        await transporter.sendMail({
          from: `Spectra Commerce <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "Spectra Seller Application Update",
          html: getEmailTemplate("Application Update", content),
        });
      }
    } catch (mailErr) {
      console.error("Failed to send rejection email:", mailErr.message);
    }

    res.json({ message: "Seller application rejected." });
  } catch (err) {
    console.error("seller/reject error:", err);
    res.status(500).json({ error: "Failed to reject seller." });
  }
});

// Reset seller status (for re-applying after rejection)
router.post("/seller/reset", protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        sellerStatus: "none",
        sellerRejectionReason: "",
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found." });

    const userPayload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isSeller: user.isSeller,
      sellerStatus: user.sellerStatus,
      address: user.address,
      contactNo: user.contactNo,
      age: user.age,
    };

    res.json({ message: "Seller status reset successfully.", user: userPayload });
  } catch (err) {
    console.error("seller/reset error:", err);
    res.status(500).json({ error: "Failed to reset seller status." });
  }
});

export default router;
