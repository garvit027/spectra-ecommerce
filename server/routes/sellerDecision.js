// server/routes/sellerDecision.js
import express from "express";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js"; // your nodemailer helper

const router = express.Router();

router.post("/:userId", async (req, res) => {
  try {
    const { status, reason } = req.body;
    const { userId } = req.params;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (status === "approved") {
      user.isSeller = true;
      user.sellerStatus = "approved";
    } else {
      user.isSeller = false;
      user.sellerStatus = "rejected";
      user.sellerRejectionReason = reason || "No reason provided";
    }
    await user.save();

    // Send email to seller
    const subject =
      status === "approved"
        ? "🎉 You are now a Verified Seller!"
        : "❌ Your Seller Application was Rejected";

    const body =
      status === "approved"
        ? `<h2>Congratulations!</h2><p>Your seller application has been approved. You can now start selling on Spectra.</p>`
        : `<h2>Application Rejected</h2><p>${reason || "Your application has been rejected."}</p>`;

    await sendEmail(user.email, subject, body);

    res.json({ message: `Seller ${status}`, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;