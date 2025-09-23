// server/models/SellerSettings.js
import mongoose from "mongoose";

const sellerSettingsSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, index: true },

    // manual portal toggle
    storeActive: { type: Boolean, default: true },

    // holiday: 1-day toggle
    holiday: {
      on: { type: Boolean, default: false },
      date: { type: Date, default: null }, // specific day
      mode: { type: String, enum: ["pause", "delay"], default: "delay" }, // pause: hide all, delay: increase ETA
      delayDays: { type: Number, default: 1 },
    },

    // vacation: multi-day
    vacation: {
      on: { type: Boolean, default: false },
      start: { type: Date, default: null },
      end: { type: Date, default: null },
      hideProducts: { type: Boolean, default: true },
      delayDays: { type: Number, default: 3 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("SellerSettings", sellerSettingsSchema);