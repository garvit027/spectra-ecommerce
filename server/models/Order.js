// backend/models/Order.js
import mongoose from "mongoose";

// --- Order Item Schema ---
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: String,
    qty: { type: Number, default: 1 },
    price: { type: Number, required: true },
    image: String, // snapshot for UI
    // denormalized seller for quick lookups
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { _id: false }
);

// --- Main Order Schema ---
const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // buyer

    items: [orderItemSchema],

    subtotal: { type: Number, required: true, default: 0 },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },

    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },

    placedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },

    // ✅ promotion tracking (AI + marketing insights)
    promotionId: { type: mongoose.Schema.Types.ObjectId, ref: "Promotion", default: null },

    // For payment gateway results (PayPal/Stripe etc.)
    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);