import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Promotion from "../models/Promotion.js";
import SellerSettings from "../models/SellerSettings.js";
import { protectSeller } from "../middlewares/authMiddleware.js";
import mongoose from 'mongoose'; // Import mongoose if using ObjectId directly

const router = express.Router();

/** ---------- UTIL ---------- */
const getDaysFromRange = (range) => {
  switch (range) {
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    default: return 7; // Default to 7 days
  }
};

// Helper to convert day number (1-7, Mon-Sun) to short name
const dayNumToShortName = (dayNum) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    // Adjust index (MongoDB %u is 1-7, array is 0-6)
    const index = parseInt(dayNum, 10) - 1;
    return days[index] || "Unk";
};


/** ---------- SELLER SETTINGS (Holiday/Vacation/Toggle) ---------- */
// Helper: Translates complex DB model -> simple flat frontend object
const settingsToFrontend = (s) => {
  // ... (settingsToFrontend function remains the same) ...
    if (!s) {
    // Return frontend defaults
    return {
      paused: false,
      mode: "normal",
      holidayDate: null,
      vacationFrom: null,
      vacationTo: null,
      handling: "extend",
      extendDays: 2,
    };
  }

  let mode = "normal";
  if (s.holiday?.on) mode = "holiday";
  if (s.vacation?.on) mode = "vacation";

  let handling = "extend"; // 'extend'
  if (mode === "holiday" && s.holiday?.mode === "pause") handling = "pause";
  if (mode === "vacation" && s.vacation?.hideProducts === true) handling = "pause";

  let extendDays = 2;
  if (mode === "holiday") extendDays = s.holiday?.delayDays || 1;
  if (mode === "vacation") extendDays = s.vacation?.delayDays || 3;

  return {
    paused: !s.storeActive, // Invert storeActive to frontend's 'paused'
    mode: mode,
    holidayDate: s.holiday?.date ? s.holiday.date.toISOString().split('T')[0] : null,
    vacationFrom: s.vacation?.start ? s.vacation.start.toISOString().split('T')[0] : null,
    vacationTo: s.vacation?.end ? s.vacation.end.toISOString().split('T')[0] : null,
    handling: handling,
    extendDays: extendDays,
  };
};

// Helper: Translates simple flat frontend object -> complex nested DB model
const frontendToSettings = (body) => {
  // ... (frontendToSettings function remains the same) ...
    const {
    paused,
    mode,
    holidayDate,
    vacationFrom,
    vacationTo,
    handling,
    extendDays,
  } = body;

  const settings = {
    storeActive: !paused, // Invert frontend's 'paused' to 'storeActive'
    holiday: {
      on: mode === "holiday",
      date: holidayDate || null,
      mode: handling === "pause" ? "pause" : "delay",
      delayDays: (mode === "holiday" ? extendDays : 1) || 1,
    },
    vacation: {
      on: mode === "vacation",
      start: vacationFrom || null,
      end: vacationTo || null,
      hideProducts: handling === "pause",
      delayDays: (mode === "vacation" ? extendDays : 3) || 3,
    },
  };

  return settings;
};

// GET seller settings
router.get("/availability", protectSeller, async (req, res) => {
  // ... (GET /availability route remains the same) ...
    try {
    let s = await SellerSettings.findOne({ seller: req.user._id }).lean();
    if (!s) {
      await SellerSettings.create({ seller: req.user._id });
      s = await SellerSettings.findOne({ seller: req.user._id }).lean();
    }
    res.json(settingsToFrontend(s));
  } catch (e) {
    console.error("GET Availability Error:", e);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// UPDATE seller settings
router.put("/availability", protectSeller, async (req, res) => {
  // ... (PUT /availability route remains the same) ...
    try {
    const newSettings = frontendToSettings(req.body);
    const s = await SellerSettings.findOneAndUpdate(
      { seller: req.user._id },
      { $set: newSettings },
      { new: true, upsert: true }
    ).lean();
    res.json(settingsToFrontend(s));
  } catch (e) {
    console.error("PUT Availability Error:", e);
    res.status(500).json({ error: "Failed to save settings" });
  }
});


/** ---------- DASHBOARD ---------- */
router.get("/dashboard", protectSeller, async (req, res) => {
  try {
    const days = getDaysFromRange(req.query.range);
    const since = new Date(Date.now() - days * 86400000);
    // Ensure sellerId is a MongoDB ObjectId if needed for matching
    // const sellerId = req.user._id; // Already an ObjectId from middleware/DB
     const sellerId = new mongoose.Types.ObjectId(req.user.id); // More explicit


    console.log(`Fetching dashboard data for seller: ${sellerId}, range: ${days} days (since ${since.toISOString()})`);

    const [ordersAgg, products, recentOrdersDocs, topProductsAgg, customersAgg] =
      await Promise.all([
        // Sales aggregation
        Order.aggregate([
          // Match orders containing items sold by this seller within the date range
          { $match: {
              "items.seller": sellerId,
              placedAt: { $gte: since }
            }
          },
          // Unwind the items array to process each item individually
          { $unwind: "$items" },
          // Match again to filter only the items sold by this specific seller
          { $match: { "items.seller": sellerId } },
          // Group by day to calculate daily sales and order count *for this seller*
          {
            $group: {
              _id: {
                // ✅ FIX: Changed format from "%a" to "%u" (Day of week 1-7, Mon=1)
                dayOfWeekNum: { $dateToString: { date: "$placedAt", format: "%u", timezone: "Asia/Kolkata" } }, // Use timezone
                // Keep the full date for sorting
                fullDate: { $dateToString: { date: "$placedAt", format: "%Y-%m-%d", timezone: "Asia/Kolkata" } }, // Use timezone
              },
              // Count distinct orders for that day (using $addToSet on order ID) might be complex here
              // Simpler: Summing item sales and counting items sold by this seller per day
              orders: { $sum: 1 }, // This counts items sold by seller per day, NOT unique orders. Adjust if needed.
              sales: { $sum: { $multiply: ["$items.price", "$items.qty"] } }, // Calculate item total price
            },
          },
          // Sort by the full date to ensure chronological order
          { $sort: { "_id.fullDate": 1 } },
        ]).catch(err => { console.error("Aggregation Error (ordersAgg):", err); throw err; }), // Add catch block

        // Seller products (ensure only active products are counted or displayed?)
        Product.find({ seller: sellerId /*, isActive: true */ }).select( // Added isActive filter example
          "name stock price images rating numReviews"
        ).lean(),

        // Recent orders (last 8 where seller has an item)
        Order.find({ "items.seller": sellerId /* , placedAt: { $gte: since } */ }) // Re-added date filter if desired
          .sort({ placedAt: -1 })
          .limit(8)
          .select("placedAt status total items user") // Keep total price
          .populate("user", "name") // Populate buyer name
          .lean(),

        // Top products sold by this seller in the range
        Order.aggregate([
          { $match: { "items.seller": sellerId, placedAt: { $gte: since } } },
          { $unwind: "$items" },
          { $match: { "items.seller": sellerId } },
          {
            $group: {
              _id: "$items.product", // Group by product ID
              salesCount: { $sum: "$items.qty" }, // Sum quantities sold
              revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } }, // Sum revenue per product
            },
          },
          { $sort: { revenue: -1 } }, // Sort by revenue
          { $limit: 8 }, // Top 8
          // Lookup product details
          {
            $lookup: {
              from: "products", // Collection name (usually plural lowercase)
              localField: "_id",
              foreignField: "_id",
              as: "productDetails",
            },
          },
           // Check if lookup found a product
           { $match: { productDetails: { $ne: [] } } },
          { $unwind: "$productDetails" }, // Unwind the result array
          // Project the desired fields
          {
            $project: {
              _id: 0, // Exclude the default _id (product ID) from this stage
              id: "$_id", // Rename _id to id
              name: "$productDetails.name",
              sales: "$salesCount", // Use salesCount
              revenue: 1, // Keep revenue
              stock: "$productDetails.stock",
              rating: "$productDetails.rating",
              image: { $arrayElemAt: ["$productDetails.images", 0] }, // Get first image
            },
          },
        ]).catch(err => { console.error("Aggregation Error (topProductsAgg):", err); throw err; }), // Add catch block

        // Customers who bought from this seller (simplified version)
         Order.aggregate([
            // Match orders involving this seller
             { $match: { "items.seller": sellerId } },
             // Group by user (buyer)
             { $group: {
                  _id: "$user",
                  orderCount: { $sum: 1 }, // Count orders per user
                 // lastOrderAt: { $max: "$placedAt" } // Optional: track last order date
              }},
             { $count: "customerCount" } // Just count distinct customers
         ]).catch(err => { console.error("Aggregation Error (customersAgg):", err); return [{ customerCount: 0 }]; }), // Return default on error

      ]);

    // Shape sales data for the chart
    const salesData = ordersAgg.map((d) => ({
      // ✅ Use the day number and convert to short name
      name: dayNumToShortName(d._id.dayOfWeekNum),
      sales: Math.round(d.sales || 0),
      orders: d.orders || 0, // Count of items sold by seller that day
      // visitors calculation seems arbitrary, removing or adjusting
      // visitors: Math.round((d.orders || 0) * 8.5),
    }));

     // Calculate average rating safely
     const avgRating = products.length > 0
        ? Number(
            (
                products.reduce((a, p) => a + (p.rating || 0), 0) / products.length
            ).toFixed(1)
          )
        : 0;


    // Shape dashboard stats
    const dashboardStats = {
      revenue: { current: salesData.reduce((a, b) => a + b.sales, 0) },
      orders: { current: salesData.reduce((a, b) => a + b.orders, 0) }, // Sum of items sold by seller
      products: { current: products.length }, // Count of seller's products
      customers: { current: customersAgg[0]?.customerCount || 0 }, // Get count from aggregation result
      rating: { current: avgRating },
      views: { current: 0 }, // Views need a separate tracking mechanism
    };

     // Shape recent orders
     const recentOrders = recentOrdersDocs.map((o) => {
         // Find the first item sold by this seller in the order for display, or show generic info
         const sellerItem = o.items?.find(item => item.seller?.toString() === sellerId.toString());
         return {
             id: `#${String(o._id).slice(-6).toUpperCase()}`, // Use slice of MongoDB ID
             customer: o.user?.name ?? "Customer",
             product: sellerItem?.name ?? (o.items?.length > 0 ? `${o.items.length} items` : "N/A"),
             amount: Math.round(o.total ?? 0), // Use the order total
             status: o.status,
             date: o.placedAt ? o.placedAt.toISOString().slice(0, 10) : "N/A",
             itemsCount: o.items?.length ?? 0, // Total items in the order
         };
     });

    // Ensure topProducts is always an array, even if aggregation fails or returns empty
    const finalTopProducts = Array.isArray(topProductsAgg) ? topProductsAgg : [];

    console.log("Dashboard data processed successfully.");

    res.json({
      dashboardStats,
      salesData,
      recentOrders,
      topProducts: finalTopProducts.length
        ? finalTopProducts // Use aggregated top products if available
        : products.slice(0, 4).map((p) => ({ // Fallback to first 4 products
            id: p._id,
            name: p.name,
            sales: 0,
            revenue: 0,
            stock: p.stock,
            rating: p.rating || 0,
            image: p.images?.[0],
          })),
      notifications: 0, // Placeholder for notifications count
    });
  } catch (e) {
    console.error("GET /seller/dashboard error:", e); // Log the main catch block error
    res.status(500).json({ error: "Failed to load dashboard data", details: e.message });
  }
});


/** ---------- ORDERS ---------- */
router.get("/orders", protectSeller, async (req, res) => {
  // ... (GET /orders route remains the same) ...
    try {
    const { status, q } = req.query;
    const match = { "items.seller": req.user._id };
    if (status) match.status = status;

    const orders = await Order.find(match)
      .sort({ placedAt: -1 })
      .populate("user", "name")
      .limit(100)
      .lean();

    const shaped = orders.map((o) => ({
      id: `#${String(o._id).slice(-6).toUpperCase()}`,
      _id: o._id,
      customer: o.user?.name ?? "Customer",
      // Find first item by this seller for display name
      product: o.items?.find(it => it.seller.equals(req.user._id))?.name || `${o.items?.length || 0} items`,
      amount: Math.round(o.total || 0),
      status: o.status,
      date: o.placedAt ? o.placedAt.toISOString().slice(0, 10) : 'N/A',
      itemsCount: o.items?.length ?? 0,
    }));

    // Filter based on query if present
    const filtered = q
      ? shaped.filter((o) =>
          `${o.id} ${o.customer} ${o.product}` // Search in ID, customer, product name
            .toLowerCase()
            .includes(q.toLowerCase())
        )
      : shaped;

    res.json(filtered);
  } catch (err) {
      console.error("GET /seller/orders error:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

router.patch("/orders/:id/status", protectSeller, async (req, res) => {
  // ... (PATCH /orders/:id/status route remains the same) ...
    try {
    const { status } = req.body;
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Ensure this seller is actually associated with an item in this order
    const hasSellerItem = order.items.some(
      (it) => it.seller?.equals(req.user._id)
    );
    // Allow Admins to override? Add check: || req.user.isAdmin
    if (!hasSellerItem) {
        console.warn(`Seller ${req.user.id} tried to update status for order ${order._id} without owning an item.`);
        return res.status(403).json({ error: "Not authorized to update status for this order" });
    }

    // Optional: Add logic constraints (e.g., cannot revert from 'delivered')
    // if (order.status === 'delivered' && status !== 'delivered') { ... }

    order.status = status;
    // If setting to delivered, update deliveredAt timestamp
    if (status === 'delivered' && !order.deliveredAt) {
        order.deliveredAt = new Date();
    }
    // Consider implications if cancelling (e.g., stock adjustment? Payment refund trigger?)

    await order.save();
    console.log(`Order ${order._id} status updated to ${status} by seller ${req.user.id}`);
    res.json(order.toObject()); // Return plain object

  } catch (err) {
      console.error(`PATCH /seller/orders/${req.params.id}/status error:`, err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

/** ---------- CUSTOMERS ---------- */
router.get("/customers", protectSeller, async (req, res) => {
  // ... (GET /customers route remains the same) ...
    try {
    // Aggregation to find distinct users who bought from this seller
    const customers = await Order.aggregate([
      // Match orders containing items from this seller
      { $match: { "items.seller": req.user._id } },
      // Group by user to get unique buyers
      {
        $group: {
          _id: "$user",
          lastOrderAt: { $max: "$placedAt" }, // Track last purchase date
          orderCount: { $sum: 1 },           // Total orders from this user (containing seller's items)
          totalSpentOnSeller: {              // More complex: sum only seller's items if needed
              $sum: {
                  $reduce: {
                      input: "$items",
                      initialValue: 0,
                      in: {
                          $add: [
                              "$$value",
                              { $cond: [ { $eq: [ "$$this.seller", req.user._id ] }, { $multiply: ["$$this.price", "$$this.qty"] } , 0 ] }
                          ]
                      }
                  }
              }
          }
        },
      },
      { $sort: { lastOrderAt: -1 } }, // Sort by most recent
      { $limit: 100 }, // Limit results
      // Lookup user details
      {
        $lookup: {
          from: "users", // the name of the users collection
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      // Ensure user details were found
      { $match: { userDetails: { $ne: [] } } },
      { $unwind: "$userDetails" },
      // Project final fields
      {
        $project: {
          _id: 0, // Exclude the default group _id (user ID)
          userId: "$_id",
          name: "$userDetails.name",
          email: "$userDetails.email", // Optional: include email
          orders: "$orderCount",
          totalSpent: "$totalSpentOnSeller", // Use the calculated sum for seller items
          lastOrderAt: 1,
        },
      },
    ]);
    res.json(customers);
  } catch (err) {
      console.error("GET /seller/customers error:", err);
    res.status(500).json({ error: "Failed to load customers" });
  }
});

/** ---------- PROMOTIONS ---------- */
router.get("/promotions", protectSeller, async (req, res) => {
  // ... (GET /promotions route remains the same) ...
    try {
      const promos = await Promotion.find({ seller: req.user._id })
        .populate('product', 'name images') // Populate basic product info
        .sort({ createdAt: -1 }) // Show newest first
        .lean();
      res.json(promos);
  } catch (err) {
      console.error("GET /seller/promotions error:", err);
      res.status(500).json({ error: "Failed to load promotions" });
  }
});

router.post("/promotions", protectSeller, async (req, res) => {
  // ... (POST /promotions route remains the same) ...
    try {
    const { productId, name, budget, durationDays } = req.body;

    if (!productId || !budget || !durationDays) {
      return res.status(400).json({ error: "Product ID, budget, and duration are required." });
    }
     if (budget < 100 || durationDays < 1) {
          return res.status(400).json({ error: "Budget must be at least 100, duration at least 1 day." });
     }


    // Verify product belongs to the seller
    const product = await Product.findOne({ _id: productId, seller: req.user._id }).lean();
    if (!product) {
        return res.status(404).json({ message: "Product not found or does not belong to you." });
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + parseInt(durationDays, 10));


    const promo = await Promotion.create({
      seller: req.user._id,
      product: product._id,
      name: name || `Promo: ${product.name}`, // Use provided name or default
      budget: budget,
       startDate: startDate,
       endDate: endDate,
       durationDays: parseInt(durationDays, 10),
      status: 'active', // Default to active? Or 'draft'? Let's use active.
      // Initialize stats
      reach: 0,
      clicks: 0,
      sales: 0,
      spent: 0,
    });

     // Populate product details for the response
     const populatedPromo = await Promotion.findById(promo._id)
        .populate('product', 'name images')
        .lean();

    res.status(201).json(populatedPromo); // Return the created promo object

  } catch (err) {
      console.error("POST /seller/promotions error:", err);
      res.status(500).json({ error: "Failed to create promotion" });
  }
});

router.patch("/promotions/:id", protectSeller, async (req, res) => {
  // ... (PATCH /promotions/:id route remains the same) ...
    try {
     const { status } = req.body; // Only allow updating status for now (active/paused)
     const validStatuses = ['active', 'paused']; // Define allowed statuses for update

     if (!status || !validStatuses.includes(status)) {
         return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
     }

    const promo = await Promotion.findOne({
      _id: req.params.id,
      seller: req.user._id, // Ensure it belongs to the seller
    });

    if (!promo) {
        return res.status(404).json({ message: "Promotion not found or does not belong to you." });
    }

    // Update the status
    promo.status = status;
    // Optional: Add logic if pausing/activating (e.g., reset stats, check dates)

    await promo.save();

     // Populate product details for the response
     const populatedPromo = await Promotion.findById(promo._id)
        .populate('product', 'name images')
        .lean();

    res.json(populatedPromo); // Return the updated promo object

  } catch (err) {
      console.error(`PATCH /seller/promotions/${req.params.id} error:`, err);
      res.status(500).json({ error: "Failed to update promotion status" });
  }
});

/** ---------- AI INSIGHTS ---------- */
// This remains complex and potentially slow. Consider optimizing or moving to background jobs.
router.get("/ai/insights", protectSeller, async (req, res) => {
  // ... (GET /ai/insights route - keeping the fixed version) ...
    try {
    const since = new Date(Date.now() - 30 * 86400000); // Last 30 days
    const sellerId = new mongoose.Types.ObjectId(req.user.id);

    // Get seller's products with reviews and stock
    const myProducts = await Product.find({ seller: sellerId }).select("name reviews stock").lean();
    if (!myProducts || myProducts.length === 0) {
       // Return empty insights if seller has no products
       return res.json({ trending: [], reviewAnalysis: [], demandForecast: [] });
    }
    const myProductIds = myProducts.map(p => p._id);

    // --- Trending Logic ---
     // Find recent orders globally (might be slow on large datasets)
    const recentGlobalOrders = await Order.find({ placedAt: { $gte: since } })
        .select("items.product items.qty")
        .populate({ path: "items.product", select: "category name", match: { category: { $ne: null } } }) // Populate category/name, skip if no category
        .limit(1000) // Limit to avoid excessive memory usage
        .lean();

    const categoryCounts = {}; // Count sales per category
    const productCounts = {}; // Count sales per product ID

     for (const order of recentGlobalOrders) {
        for (const item of order.items || []) {
            if (item.product?.category) { // Check if product and category exist
                const cat = item.product.category;
                categoryCounts[cat] = (categoryCounts[cat] || 0) + (item.qty || 1);
            }
             if (item.product?._id) { // Check if product ID exists
                 const prodId = item.product._id.toString();
                 productCounts[prodId] = (productCounts[prodId] || 0) + (item.qty || 1);
             }
        }
    }
    // Simple trending: Top 3 products sold overall recently (could refine based on category velocity etc.)
    const topOverallProductIds = Object.entries(productCounts)
        .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
        .slice(0, 5) // Look at top 5 overall
        .map(([id]) => id);

    // Fetch details for these top products
    const topProductsDetails = await Product.find({ _id: { $in: topOverallProductIds } })
        .select("name category")
        .limit(3) // Limit to final 3
        .lean();

     const trendingResult = topProductsDetails.map(p => ({
        // productId: p._id, // Frontend might not need ID
        name: p.name || 'Unknown Product',
        reason: `High sales volume in ${p.category || 'its category'}`,
        score: Math.floor(80 + Math.random() * 20) // Dummy score
      }));


    // --- Review Analysis Logic ---
    const reviewAnalysisResult = myProducts.map(p => {
        const productReviews = p.reviews || [];
        const analysis = { packaging: 0, delivery: 0, quality: 0, price: 0, positive: 0, negative: 0 };
        const suggestions = new Set();
        const nReviews = productReviews.length;

        if (nReviews > 0) {
            for (const r of productReviews) {
                const commentLower = (r.comment || "").toLowerCase();
                if (r.rating >= 4) analysis.positive++;
                if (r.rating <= 2) analysis.negative++;
                if (/\b(packag|box|damage|broken|torn)\b/.test(commentLower)) { analysis.packaging++; suggestions.add("Improve packaging"); }
                if (/\b(late|delay|slow|courier|shipment|delivery)\b/.test(commentLower)) { analysis.delivery++; suggestions.add("Check shipping partners/speed"); }
                if (/\b(quality|defect|poor|material|issue|faulty)\b/.test(commentLower)) { analysis.quality++; suggestions.add("Review product quality control"); }
                if (/\b(price|expensive|costly|overpric)\b/.test(commentLower)) { analysis.price++; suggestions.add("Evaluate pricing strategy"); }
            }
        }

        return {
          productId: p._id,
          name: p.name,
           // Calculate percentages
          packagingIssues: nReviews > 0 ? (analysis.packaging / nReviews) : 0,
          shippingIssues: nReviews > 0 ? (analysis.delivery / nReviews) : 0,
          qualityIssues: nReviews > 0 ? (analysis.quality / nReviews) : 0,
          suggestions: Array.from(suggestions),
        };
      });

    // --- Demand Forecast Logic ---
     // Get sales specifically for the seller's products in the last 30 days
     const sellerSales = {};
     const sellerOrders = await Order.find({ "items.seller": sellerId, placedAt: { $gte: since } })
        .select("items.product items.qty")
        .lean();

      for (const order of sellerOrders) {
         for (const item of order.items || []) {
             if (item.product) { // Ensure product field exists
                const prodId = item.product.toString();
                if (myProductIds.some(myId => myId.equals(prodId))) { // Check if it's one of the seller's products
                    sellerSales[prodId] = (sellerSales[prodId] || 0) + (item.qty || 1);
                }
             }
         }
      }

      const demandForecastResult = myProducts.map((p) => {
        const productIdStr = p._id.toString();
        const salesLast30Days = sellerSales[productIdStr] || 0;
        // Simple forecast: Assume next 30 days similar to last 30 days
        const predictedDemand30 = Math.round(salesLast30Days);
        const currentStock = p.stock || 0;
        let stockRisk = "ok";
        let recommendedStock = predictedDemand30; // Recommend having at least predicted demand

        if (currentStock === 0) {
            stockRisk = "stockout";
        } else if (currentStock < Math.ceil(predictedDemand30 * 0.5)) { // Less than half of predicted demand
            stockRisk = "low stock";
        } else if (currentStock > predictedDemand30 * 2.5) { // More than 2.5x predicted demand
            stockRisk = "overstock";
        }
        // Refine recommended stock based on risk
        if (stockRisk === 'stockout') recommendedStock = Math.max(predictedDemand30, 5); // Recommend more if stocked out
        else if (stockRisk === 'low stock') recommendedStock = Math.ceil(predictedDemand30 * 1.2); // Recommend slight buffer


        return {
          productId: p._id,
          name: p.name,
          demandIndex: predictedDemand30, // Use sales as demand index
          currentStock: currentStock, // Pass current stock to frontend
          stockRisk: stockRisk,
          recommendedStock: recommendedStock,
        };
      });

    console.log("AI Insights generated successfully.");
    res.json({
      trending: trendingResult,
      reviewAnalysis: reviewAnalysisResult,
      demandForecast: demandForecastResult,
    });
  } catch (err) {
    console.error("GET /ai/insights error:", err);
    res.status(500).json({ error: "Failed to load AI insights", details: err.message });
  }
});


/** ---------- PRODUCT MANAGEMENT (Add / Edit / Delete) ---------- */

// GET seller's products
router.get("/products", protectSeller, async (req, res) => {
  // ... (GET /products route remains the same) ...
    try {
    // Optionally add sorting, e.g., sort({ createdAt: -1 })
    const products = await Product.find({ seller: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(products);
  } catch (err) {
      console.error("GET /seller/products error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Add product
router.post("/products", protectSeller, async (req, res) => {
  // ... (POST /products route remains the same) ...
    try {
    // Destructure expected fields, provide defaults
    const { name, description = '', price, stock = 0, category = 'Uncategorized', images = [] } = req.body;

    // Validate required fields
    if (!name || price === undefined || price === null || price < 0) {
      return res.status(400).json({ error: "Product name and a valid non-negative price are required." });
    }
     const numericStock = Number(stock);
     if (isNaN(numericStock) || numericStock < 0) {
          return res.status(400).json({ error: "Stock must be a non-negative number." });
     }


    const product = new Product({
      seller: req.user._id, // Set seller from authenticated user
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      stock: numericStock,
      category: category.trim(),
      // Filter out empty image strings and ensure it's an array
      images: Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.trim() !== '') : [],
      status: 'approved', // Or 'pending' if admin approval is needed
      isActive: true, // Default to active
    });

    await product.save();
    console.log(`Product "${product.name}" added successfully by seller ${req.user.id}`);
    res.status(201).json(product.toObject()); // Return plain object

  } catch (err) {
    console.error("POST /seller/products error:", err);
     if (err.name === 'ValidationError') {
       return res.status(400).json({ error: "Validation failed", details: err.message });
    }
    res.status(500).json({ error: "Failed to add product" });
  }
});

// Update product
router.put("/products/:id", protectSeller, async (req, res) => {
  // ... (PUT /products/:id route remains the same) ...
    try {
     const productId = req.params.id;
     const updateData = req.body;

    // Find the product and ensure it belongs to the seller
    const product = await Product.findOne({ _id: productId, seller: req.user._id });

    if (!product) {
        return res.status(404).json({ error: "Product not found or you do not have permission to edit it." });
    }

     // Validate and sanitize input data before updating
     const allowedUpdates = ['name', 'description', 'price', 'stock', 'category', 'images', 'brand', 'specifications', 'isActive']; // Define editable fields
     const updates = {};
     for (const key of allowedUpdates) {
         if (updateData[key] !== undefined) {
             // Add specific validation/sanitization here
             if (key === 'price' || key === 'stock') {
                 const numValue = Number(updateData[key]);
                 if (!isNaN(numValue) && numValue >= 0) {
                     updates[key] = numValue;
                 } else {
                     return res.status(400).json({ error: `Invalid value for ${key}. Must be a non-negative number.` });
                 }
             } else if (key === 'images') {
                 updates[key] = Array.isArray(updateData[key]) ? updateData[key].filter(img => typeof img === 'string' && img.trim()) : product.images;
             } else if (key === 'isActive') {
                  updates[key] = Boolean(updateData[key]);
             }
              else if (typeof updateData[key] === 'string') {
                  updates[key] = updateData[key].trim();
             }
              else {
                  updates[key] = updateData[key]; // Accept other types directly (like specifications object)
             }
         }
     }
      if (Object.keys(updates).length === 0) {
          return res.status(400).json({ message: "No valid fields provided for update." });
      }

    // Apply the updates
    Object.assign(product, updates);

    // Recompute rating if reviews exist (though reviews aren't updated here)
    if (product.reviews && product.reviews.length > 0) {
        product.recomputeRating();
    }

    await product.save();
    console.log(`Product ${product._id} updated successfully by seller ${req.user.id}`);
    res.json(product.toObject()); // Return updated plain object

  } catch (err) {
    console.error(`PUT /seller/products/${req.params.id} error:`, err);
     if (err.name === 'ValidationError') {
       return res.status(400).json({ error: "Validation failed", details: err.message });
    }
     if (err.name === 'CastError' && err.kind === 'ObjectId') {
         return res.status(404).json({ message: "Product not found (invalid ID format)" });
     }
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Delete product
router.delete("/products/:id", protectSeller, async (req, res) => {
  // ... (DELETE /products/:id route remains the same) ...
   try {
     const productId = req.params.id;

    // Find and delete the product, ensuring it belongs to the seller
    const result = await Product.deleteOne({ _id: productId, seller: req.user._id });

    if (result.deletedCount === 0) {
        // Product not found or didn't belong to the seller
        return res.status(404).json({ error: "Product not found or you do not have permission to delete it." });
    }

    console.log(`Product ${productId} deleted successfully by seller ${req.user.id}`);
    res.json({ message: "Product deleted successfully" });

  } catch (err) {
    console.error(`DELETE /seller/products/${req.params.id} error:`, err);
     if (err.name === 'CastError' && err.kind === 'ObjectId') {
         return res.status(404).json({ message: "Product not found (invalid ID format)" });
     }
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
