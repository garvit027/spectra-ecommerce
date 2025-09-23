// server/models/Promotion.js
import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: String,
    budget: Number, // planned
    spent: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    reach: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    attributedSales: { type: Number, default: 0 },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Promotion", promotionSchema);