import express from "express";
import Product from "../models/Product.js";
import SellerSettings from "../models/SellerSettings.js";
import User from "../models/User.js"; // ✨ THIS LINE WAS ADDED TO FIX THE ERROR
import { protect, protectSeller, protectAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

/** -------------------------------
 * Utility: Seller visibility check
 ---------------------------------*/
async function sellerAllowsVisibility(sellerId) {
  const s = await SellerSettings.findOne({ seller: sellerId }).lean();
  if (!s) return true; // default visible
  if (!s.storeActive) return false;

  const now = new Date();

  // Holiday check
  if (s.holiday?.on && s.holiday?.date) {
    const d = new Date(s.holiday.date);
    if (d.toDateString() === now.toDateString()) {
      if (s.holiday.mode === "pause") return false;
    }
  }

  // Vacation check
  if (s.vacation?.on && s.vacation.start && s.vacation.end) {
    if (now >= new Date(s.vacation.start) && now <= new Date(s.vacation.end)) {
      if (s.vacation.hideProducts) return false;
    }
  }

  return true;
}

/** -------------------------------
 * Public: List approved + visible products
 ---------------------------------*/
router.get("/", async (req, res) => {
  try {
    const base = await Product.find({ status: "approved", isActive: { $ne: false } })
      .select("-__v")
      .populate("seller", "name email")
      .lean();

    const visible = [];
    const memo = new Map();
    for (const p of base) {
      const sid = String(p.seller?._id || p.seller);
      let vis = memo.get(sid);
      if (vis === undefined) {
        vis = await sellerAllowsVisibility(sid);
        memo.set(sid, vis);
      }
      if (vis) visible.push(p);
    }

    res.json(visible);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/** -------------------------------
 * Public: Single product
 ---------------------------------*/
router.get("/:id", async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).populate("seller", "name email").lean();
    if (!p) return res.status(404).json({ message: "Not found" });

    const vis = await sellerAllowsVisibility(p.seller._id || p.seller);
    if (!vis || p.isActive === false || p.status !== "approved") {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(p);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

/** -------------------------------
 * Admin: List all products
 ---------------------------------*/
router.get("/all/list", protectAdmin, async (req, res) => {
  try {
    const products = await Product.find({})
      .select("-__v")
      .populate("seller", "name email");
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/** -------------------------------
 * Seller: List my products
 ---------------------------------*/
router.get("/mine/list", protectSeller, async (req, res) => {
  try {
    const list = await Product.find({ seller: req.user._id }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your products" });
  }
});

/** -------------------------------
 * Seller/Admin: Create product
 ---------------------------------*/
router.post("/", protectSeller, async (req, res) => {
  try {
    const { name, description, price, category, stock, images, descriptionImages, specifications, variants, brand } = req.body;
    
    if (!name || price == null || !description) {
      return res.status(400).json({ error: "Name, description and price are required" });
    }

    const firstImageAsBanner = images && images.length > 0 ? [images[0]] : [];

    const newProduct = new Product({
      name,
      description,
      price,
      category,
      stock,
      images: images?.length ? images : [],
      bannerImages: firstImageAsBanner,
      descriptionImages: descriptionImages?.length ? descriptionImages : [],
      specifications,
      variants,
      brand,
      seller: req.user._id,
      status: req.user.isAdmin ? "approved" : "pending",
      isActive: true,
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

/** -------------------------------
 * Seller/Admin: Update product
 ---------------------------------*/
router.put("/:id", protectSeller, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });

    if (!req.user.isAdmin && product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    Object.keys(req.body).forEach((f) => {
      product[f] = req.body[f] !== undefined ? req.body[f] : product[f];
    });

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

/** -------------------------------
 * Seller/Admin: Delete product
 ---------------------------------*/
router.delete("/:id", protectSeller, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });

    if (!req.user.isAdmin && product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await product.deleteOne();
    res.json({ message: "Product deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

/** -------------------------------
 * Review: Add
 ---------------------------------*/
router.post("/:id/reviews", protect, async (req, res) => {
  try {
    const { rating, comment, images = [] } = req.body;
    if (!rating || !comment) {
      return res.status(400).json({ message: "Rating and comment are required" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const already = product.reviews.find((r) => r.user.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ message: "Already reviewed" });

    product.reviews.push({ user: req.user._id, name: req.user.name, rating, comment, images, createdAt: new Date() });

    product.recomputeRating();

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to add review" });
  }
});

/** -------------------------------
 * Review: Mark Helpful
 ---------------------------------*/
router.put("/:id/reviews/:rid/helpful", protect, async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });

  const rev = p.reviews.id(req.params.rid);
  if (!rev) return res.status(404).json({ message: "Review not found" });

  rev.helpful = (rev.helpful || 0) + 1;
  await p.save();
  res.json({ helpful: rev.helpful });
});

/** -------------------------------
 * Seller: Toggle product active
 ---------------------------------*/
router.patch("/:id/active", protectSeller, async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  if (String(p.seller) !== String(req.user._id)) return res.status(403).json({ message: "Not your product" });

  p.isActive = !!req.body.isActive;
  await p.save();
  res.json({ isActive: p.isActive });
});

export default router;