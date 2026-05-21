import express from "express";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { protect, protectSeller, protectAdmin } from "../middlewares/authMiddleware.js";
import { upload } from "../utils/cloudinary.js";
import { analyzeReviewsWithGemini } from "../utils/geminiAnalysis.js";
import { sendAdminDashboard } from "../utils/adminDashboard.js";

const router = express.Router();

/** -------------------------------
 * Utility: Seller visibility check
 ---------------------------------*/
async function sellerAllowsVisibility(sellerId) {
  try {
    const seller = await User.findById(sellerId).lean();
    // If seller is on vacation, products should be hidden
    return seller && !seller.onVacation;
  } catch (err) {
    return false;
  }
}

/** -------------------------------
 * Public: List approved + visible products
 ---------------------------------*/
router.get("/", async (req, res) => {
  try {
    const base = await Product.find({ status: "approved", isActive: { $ne: false } })
      .select("-__v")
      .populate("seller", "name email sellerStatus")
      .lean();

    // Re-use the seller visibility filter
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

// ✨ NEW SEARCH ENDPOINT
// Handles requests like GET /api/products/search?q=keyword
router.get("/search", async (req, res) => {
  try {
    const keyword = req.query.q
      ? {
          $or: [
            { name: { $regex: req.query.q, $options: "i" } },
            { description: { $regex: req.query.q, $options: "i" } },
            { brand: { $regex: req.query.q, $options: "i" } },
            { category: { $regex: req.query.q, $options: "i" } },
          ],
        }
      : {};

    const base = await Product.find({ ...keyword, status: "approved", isActive: { $ne: false } })
      .select("-__v")
      .populate("seller", "name email sellerStatus")
      .lean();

    // Re-use the seller visibility filter
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
    console.error("Product search error:", err);
    res.status(500).json({ error: "Failed to search for products" });
  }
});

/** -------------------------------
 * Public: Single product
 ---------------------------------*/
router.get("/:id", async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).populate("seller", "name email sellerStatus").lean();
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
      .populate("seller", "name email sellerStatus")
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/** -------------------------------
 * Public: List products by seller
 ---------------------------------*/
router.get("/seller/:sellerId", async (req, res) => {
  try {
    const seller = await User.findById(req.params.sellerId).select("name email sellerStatus businessInfo onVacation").lean();
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    if (seller.onVacation) {
      return res.json({ products: [], seller, onVacation: true });
    }

    const products = await Product.find({ 
      seller: req.params.sellerId, 
      status: "approved", 
      isActive: { $ne: false } 
    })
    .populate("seller", "name email sellerStatus businessInfo onVacation")
    .lean();
    
    res.json({ products, seller, onVacation: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch seller products" });
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

    const productImages = Array.isArray(images) ? images.filter(img => img && img.trim() !== "") : [];
    const firstImageAsBanner = productImages.length > 0 ? [productImages[0]] : [];

    const newProduct = new Product({
      name,
      description,
      price: Number(price) || 0,
      category: category || "Uncategorized",
      stock: Number(stock) || 0,
      images: productImages,
      bannerImages: firstImageAsBanner,
      descriptionImages: Array.isArray(descriptionImages) ? descriptionImages : [],
      specifications: specifications || {},
      variants: Array.isArray(variants) ? variants : [],
      brand: brand || "",
      seller: req.user._id,
      status: req.user.isAdmin ? "approved" : "pending",
      isActive: true,
    });

    await newProduct.save();

    // 🔴 Socket.io: broadcast new product live
    const io = req.app.get("io");
    if (io) io.emit("product_created", newProduct);

    // 📧 Admin email notification
    sendAdminDashboard(
      `New Product Listed: ${name}`,
      "New Product Listed",
      `<p><strong>${req.user.name}</strong> just listed a new product.</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px;">
         <tr><td style="padding:6px 0;"><strong>Product:</strong></td><td>${name}</td></tr>
         <tr><td><strong>Price:</strong></td><td>Rs. ${price}</td></tr>
         <tr><td><strong>Category:</strong></td><td>${category || "Uncategorized"}</td></tr>
         <tr><td><strong>Stock:</strong></td><td>${stock}</td></tr>
       </table>`
    );

    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Add Product Error:", err);
    res.status(500).json({ error: "Failed to add product", details: err.message });
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

    const updates = { ...req.body };
    
    // Handle banner logic if images are updated
    if (updates.images && Array.isArray(updates.images)) {
      const validImages = updates.images.filter(img => img && img.trim() !== "");
      updates.images = validImages;
      if (validImages.length > 0) {
        updates.bannerImages = [validImages[0]];
      }
    }

    Object.keys(updates).forEach((f) => {
      if (updates[f] !== undefined) product[f] = updates[f];
    });

    await product.save();

    // 🔴 Socket.io: broadcast product update live
    const io = req.app.get("io");
    if (io) io.emit("product_updated", product);

    res.json(product);
  } catch (err) {
    console.error("Update error:", err);
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

    // 🔴 Socket.io: broadcast product deletion live
    const io = req.app.get("io");
    if (io) io.emit("product_deleted", { _id: req.params.id });

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

    // 🔴 Socket.io: broadcast review update live
    const io = req.app.get("io");
    if (io) io.emit("product_updated", { _id: product._id, rating: product.rating, numReviews: product.numReviews });

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

  const io = req.app.get("io");
  if (io) io.emit("product_updated", { _id: p._id, isActive: p.isActive });

  res.json({ isActive: p.isActive });
});

/** -------------------------------
 * Public: Gemini AI Review Analysis
 ---------------------------------*/
router.get("/:id/ai-analysis", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    const analysis = await analyzeReviewsWithGemini(product.reviews, product.name);
    res.json(analysis);
  } catch (err) {
    console.error("Gemini analysis error:", err);
    res.status(500).json({ error: "AI analysis failed. Please try again later." });
  }
});

export default router;