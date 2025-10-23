import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, index: true },

    contactNo: { type: String, default: "" },
    age: { type: String, default: "" },

    // ✅ ADDED ADDRESS FIELD
    address: { type: String, default: "" },

    // Roles
    isAdmin: { type: Boolean, default: false },
    isSeller: { type: Boolean, default: false },

    // Seller application flow
    sellerStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    sellerApprovalToken: { type: String, default: null },

    // Optional business info
    businessInfo: {
      businessName: String,
      businessType: String,
      address: String, 
      phone: String,
      taxId: String,
      description: String,
      approvedAt: Date,
      appliedAt: Date,
    },

  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
