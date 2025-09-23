// server/models/SellerApplication.js
import mongoose from "mongoose";

const SellerApplicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true },
    businessName: { type: String, required: true },
    businessType: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    taxId: { type: String, default: "" },
    description: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // One-time token for admin review via email link
    reviewToken: { type: String, required: true, unique: true },
    reviewTokenExpiresAt: { type: Date, required: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: String }, // admin email (optional; for your records)
  },
  { timestamps: true }
);

export default mongoose.model("SellerApplication", SellerApplicationSchema);