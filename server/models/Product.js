// server/models/Product.js
import mongoose from "mongoose";

// --- Review Schema ---
const ReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true }, // snapshot of user name
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    images: { type: [String], default: [] },
    helpful: { type: Number, default: 0 },
    voters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // prevent double votes
  },
  { timestamps: true }
);

// --- Product Schema ---
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: "" },
    description: { type: String, required: true },
    category: { type: String, default: "Uncategorized" },

    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },

    stock: { type: Number, default: 0, min: 0 },
    stockCount: { type: Number, default: 0 }, // UI compatibility

    images: {
      type: [String],
      default: ["https://via.placeholder.com/600x600.png?text=Product"],
    },
    bannerImages: {
      type: [String],
      default: ["https://via.placeholder.com/1200x600.png?text=Banner"],
    },
    descriptionImages: { type: [String], default: [] },

    variants: [
      {
        id: String,
        name: String,
        color: String,
        inStock: Boolean,
      },
    ],

    specifications: { type: Map, of: String, default: {} },

    // Ownership
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Status/Visibility
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    isActive: { type: Boolean, default: true }, // seller can toggle products

    // Ratings
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },

    // Reviews
    reviews: [ReviewSchema],

    // Promotion tracking
    promotion: {
      promoted: { type: Boolean, default: false },
      reach: { type: Number, default: 0 }, // how many people saw it
      salesThroughPromotion: { type: Number, default: 0 }, // tracked sales
    },
  },
  { timestamps: true }
);

// --- Helper: recompute rating ---
ProductSchema.methods.recomputeRating = function () {
  this.numReviews = this.reviews.length;
  this.rating =
    this.numReviews === 0
      ? 0
      : this.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
        this.numReviews;
};

export default mongoose.model("Product", ProductSchema);