// backend/routes/orderRoutes.js
import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { protect, protectSeller, protectAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/orders
 * @desc    Create new order (cart checkout)
 * @access  Private (User)
 */
router.post("/", protect, async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    const order = new Order({
      user: req.user.id,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      status: "pending",
      placedAt: new Date(),
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (err) {
    res.status(500).json({ error: "Failed to create order" });
  }
});

/**
 * @route   POST /api/orders/buy-now
 * @desc    Buy a single product instantly
 * @access  Private (User)
 */
router.post("/buy-now", protect, async (req, res) => {
  try {
    const { productId, qty = 1, promotionId = null } = req.body;
    const product = await Product.findById(productId).lean();

    if (!product || product.isActive === false) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.stock < qty) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    const item = {
      product: product._id,
      name: product.name,
      qty,
      price: product.price * qty,
      image: product.images?.[0] || "",
      seller: product.seller,
    };

    const order = await Order.create({
      user: req.user._id,
      orderItems: [item],
      totalPrice: item.price,
      status: "pending",
      placedAt: new Date(),
      promotionId: promotionId || null,
    });

    await Product.updateOne({ _id: product._id }, { $inc: { stock: -qty } });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: "Buy Now failed" });
  }
});

/**
 * @route   GET /api/orders/mine
 * @desc    Get logged-in user's orders
 * @access  Private (User)
 */
router.get("/mine", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("orderItems.product", "name price images");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your orders" });
  }
});

/**
 * @route   GET /api/orders/seller
 * @desc    Get seller’s product orders
 * @access  Private (Seller)
 */
router.get("/seller", protectSeller, async (req, res) => {
  try {
    const orders = await Order.find({ "orderItems.seller": req.user.id })
      .sort({ placedAt: -1 })
      .populate("user", "name email")
      .populate("orderItems.product", "name price images");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch seller orders" });
  }
});

/**
 * @route   GET /api/orders
 * @desc    Get all orders (Admin only)
 * @access  Private (Admin)
 */
router.get("/", protectAdmin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("user", "name email")
      .populate("orderItems.product", "name price");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all orders" });
  }
});

/**
 * @route   PUT /api/orders/:id/pay
 * @desc    Mark order as paid
 * @access  Private (User)
 */
router.put("/:id/pay", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: "Failed to update order payment" });
  }
});

/**
 * @route   PUT /api/orders/:id/deliver
 * @desc    Mark order as delivered
 * @access  Private (Seller/Admin)
 */
router.put("/:id/deliver", protectSeller, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: "Failed to update delivery status" });
  }
});

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status (seller controlled)
 * @access  Private (Seller)
 */
router.patch("/:id/status", protectSeller, async (req, res) => {
  const { status } = req.body;
  if (!["pending", "processing", "shipped", "delivered", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const has = order.orderItems.some((it) => String(it.seller) === String(req.user._id));
  if (!has) return res.status(403).json({ message: "Not your order" });

  order.status = status;
  await order.save();
  res.json(order.toObject());
});

export default router;