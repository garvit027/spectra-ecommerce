// server/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, index: true },
    password: { type: String, required: true },

    contactNo: { type: String, default: "" },
    age: { type: String, default: "" },

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

// --- Methods ---
userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

// --- Hash password before save ---
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export default mongoose.model("User", userSchema);