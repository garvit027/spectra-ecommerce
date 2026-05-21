import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/Order.js";
// Ensure the path to Product model is correct based on your folder structure
import Product from "../models/Product.js";
import { protect, protectSeller, protectAdmin } from "../middlewares/authMiddleware.js";
import transporter from "../utils/email.js";
import { generateInvoiceBuffer } from "../utils/invoiceGenerator.js";
import { getEmailTemplate } from "../utils/emailTemplate.js";
import { sendAdminDashboard } from "../utils/adminDashboard.js";

const router = express.Router();

async function handlePaymentSuccess(order, req) {
  const io = req.app.get("io");
  if (io) {
    io.emit("order_update", {
      orderId: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      user: order.user
    });
  }

  try {
    const pdfBuffer = await generateInvoiceBuffer(order);
    await order.populate("user", "email name");
    
    const userEmail = order.user?.email || (req.user && req.user.email);
    if (userEmail) {
      const content = `
        <p>Thank you for shopping with Spectra Commerce!</p>
        <p>Your payment has been successfully processed. Please find your detailed invoice attached to this email.</p>
        <p>If you have any questions about your order, feel free to reply directly to this email.</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/order-history" class="btn">Track Your Order</a></p>
      `;
      await transporter.sendMail({
        from: `Spectra Commerce <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: `Invoice for your Spectra Commerce Order ${order._id}`,
        html: getEmailTemplate(`Order Confirmed!`, content),
        attachments: [
          {
            filename: `invoice_${order._id}.pdf`,
            content: pdfBuffer
          }
        ]
      });
      console.log(`Invoice emailed for order ${order._id}`);
    }
  } catch (err) {
    console.error("Failed to generate or send invoice:", err);
  }
}

/**
 * @route   POST /api/orders
 * @desc    Create new order (from 'Buy Now' or Cart)
 * @access  Private (User)
 */
router.post("/", protect, async (req, res) => {
  try {
    const { items, shippingAddress, subtotal, shipping, tax, total, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.fullName) {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    // Basic validation for required fields
    if (total === undefined || total === null) {
         return res.status(400).json({ message: "Total price is required" });
    }

    // Update stock counts
    for (const item of items) {
       if (!item.product || !item.qty || item.qty <= 0) {
           return res.status(400).json({ message: `Invalid item data: ${JSON.stringify(item)}` });
       }
      const product = await Product.findById(item.product);
       if (!product) {
           return res.status(404).json({ message: `Product with ID ${item.product} not found.` });
       }
       if (product.stock < item.qty) {
            return res.status(400).json({ message: `Insufficient stock for product: ${product.name} (Requested: ${item.qty}, Available: ${product.stock})` });
       }
      // Decrement stock
      product.stock -= item.qty;
      await product.save();
    }

    const order = new Order({
      user: req.user.id, // ID from protect middleware
      items: items.map(item => ({ // Ensure only relevant fields are saved
          product: item.product,
          name: item.name,
          qty: item.qty,
          price: item.price, // Price per item at time of order
          image: item.image,
          seller: item.seller, // Make sure seller ID is passed correctly from frontend
          variant: item.variant // Save variant info if provided
      })),
      shippingAddress: { // Save validated address
          fullName: shippingAddress.fullName,
          address: shippingAddress.address,
          phone: shippingAddress.phone || '', // Optional phone
      },
      subtotal: subtotal || total, // Fallback if subtotal isn't provided separately
      shipping: shipping || 0,
      tax: tax || 0,
      total: total,

      status: "pending",           // Default status
      paymentStatus: "unpaid",     // Default payment status
      placedAt: new Date(),
      paymentMethod: paymentMethod || 'COD'
    });

    let createdOrder = await order.save();

    if (paymentMethod === 'Razorpay') {
      let razorpayOrderId = null;
      const hasKeyId = !!process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder';
      const hasSecret = !!process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET !== 'placeholder_secret';

      if (hasKeyId && hasSecret) {
        try {
          const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
          });

          const rzpOrder = await razorpay.orders.create({
            amount: Math.round(total * 100), // in paise
            currency: "INR",
            receipt: `receipt_${createdOrder._id}`,
          });
          razorpayOrderId = rzpOrder.id;
        } catch (rzpErr) {
          console.error("Razorpay Order Creation Error:", rzpErr);
          if (process.env.TEST_MODE === "true") {
            console.warn("Razorpay API failed, falling back to mock Razorpay order ID since TEST_MODE=true");
            razorpayOrderId = `mock_rzp_${Date.now()}`;
          } else {
            // Rollback order stock and delete order if razorpay fails and not in test mode
            for (const item of items) {
              const product = await Product.findById(item.product);
              if (product) {
                product.stock += item.qty;
                await product.save();
              }
            }
            await Order.findByIdAndDelete(createdOrder._id);
            return res.status(500).json({ message: "Razorpay payment initialization failed: " + rzpErr.message });
          }
        }
      } else {
        console.log("[RAZORPAY MOCK MODE] Missing/placeholder Razorpay keys. Generating mock Razorpay Order ID.");
        razorpayOrderId = `mock_rzp_${Date.now()}`;
      }

      createdOrder.razorpayOrderId = razorpayOrderId;
      createdOrder = await createdOrder.save();
    }

    console.log("Order created successfully:", createdOrder._id);

    // 🔴 Socket.io: notify seller of new order in real-time
    const io = req.app.get("io");
    if (io) io.emit("new_order", { orderId: createdOrder._id, total, items, user: req.user.id });

    // 📧 Admin dashboard email for new order
    const itemList = items.map(i => `<li>${i.name} x${i.qty} — Rs. ${i.price * i.qty}</li>`).join("");
    sendAdminDashboard(
      `New Order Placed — Rs. ${total}`,
      "New Order Received! 🛒",
      `<p>A new order has been placed on Spectra Commerce.</p>
       <ul style="padding-left:16px;">${itemList}</ul>
       <p><strong>Total: Rs. ${total}</strong></p>
       <p>Payment Method: ${paymentMethod || "COD"}</p>`
    );

    res.status(201).json({
      ...createdOrder.toObject(),
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'
    });

  } catch (err) {
    console.error("Create Order Error:", err);
    if (err.name === 'ValidationError') {
       return res.status(400).json({ error: "Validation failed", details: err.message });
    }
    res.status(500).json({ error: "Failed to create order. Please try again later." });
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
      .sort({ placedAt: -1 }) // Show newest first
      .populate("items.product", "name price images category"); // Populate more product details if needed
    res.json(orders);
  } catch (err) {
     console.error("Fetch User Orders Error:", err);
    res.status(500).json({ error: "Failed to fetch your orders" });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private (User who owns order, or Admin)
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email") // Populate user info
      .populate("items.product", "name price images category"); // Populate basic product info

    if (!order) {
        console.warn(`Order not found for ID: ${req.params.id}`);
        return res.status(404).json({ message: "Order not found" });
    }

    // Check ownership or admin status
    if (order.user._id.equals(req.user.id) || req.user.isAdmin) {
      res.json(order);
    } else {
        console.warn(`User ${req.user.id} attempted to access order ${req.params.id} owned by ${order.user._id}`);
        res.status(403).json({ message: "Not authorized to view this order" });
    }
  } catch (err) {
    console.error("Get Order By ID Error:", err);
    // If ID format is invalid, Mongoose might throw CastError
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        console.warn(`Invalid Order ID format: ${req.params.id}`);
        return res.status(404).json({ message: "Order not found (invalid ID format)" });
    }
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

/**
 * @route   GET /api/orders/seller
 * @desc    Get seller’s product orders
 * @access  Private (Seller)
 */
router.get("/seller", protectSeller, async (req, res) => {
  try {
    // Find orders where at least one item's seller matches the logged-in seller
    const orders = await Order.find({ "items.seller": req.user.id })
      .sort({ placedAt: -1 })
      .populate("user", "name email") // Get buyer details
      .populate("items.product", "name price images"); // Get details of products in the order
    res.json(orders);
  } catch (err) {
    console.error("Fetch Seller Orders Error:", err);
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
    const orders = await Order.find({}) // Find all orders
      .sort({ placedAt: -1 })
      .populate("user", "name email")
      .populate("items.product", "name price");
    res.json(orders);
  } catch (err) {
     console.error("Fetch All Orders (Admin) Error:", err);
    res.status(500).json({ error: "Failed to fetch all orders" });
  }
});

/**
 * @route   PUT /api/orders/:id/pay
 * @desc    Mark order as paid (e.g., after successful Stripe payment confirmation)
 * @access  Private (User/System/Admin) - Protect appropriately based on who triggers payment success
 */
router.put("/:id/pay", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    // Optional: Add check if order belongs to user if protect middleware allows any logged-in user
    // if (!order.user.equals(req.user.id) && !req.user.isAdmin) {
    //     return res.status(403).json({ message: "Not authorized to update this order's payment" });
    // }

    // Optional: Check if already paid
    if (order.paymentStatus === 'paid') {
        return res.status(400).json({ message: "Order is already paid" });
    }

    order.paymentStatus = "paid";
    order.paidAt = Date.now();
    // Save details from payment provider (e.g., Stripe PaymentIntent)
    order.paymentResult = {
      id: req.body.id, // Payment ID (e.g., Stripe pi_...)
      status: req.body.status, // e.g., 'succeeded'
      update_time: req.body.update_time, // Timestamp from provider
      email_address: req.body.email_address, // Payer email if available
    };

    const updatedOrder = await order.save();
    console.log(`Order ${updatedOrder._id} marked as paid.`);
    // Consider emitting an event or sending notifications here
    res.json(updatedOrder);

  } catch (err) {
    console.error("Update Order Payment Error:", err);
    res.status(500).json({ error: "Failed to update order payment status" });
  }
});

/**
 * @route   PUT /api/orders/:id/deliver
 * @desc    Mark order as delivered (Admin only)
 * @access  Private (Admin)
 */
router.put("/:id/deliver", protectAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    // Optional: Check if the order has been paid and shipped before marking delivered
     if (order.paymentStatus !== 'paid') {
         return res.status(400).json({ message: "Cannot mark unpaid order as delivered." });
     }
     if (order.status !== 'shipped') {
          console.warn(`Admin marking order ${order._id} as delivered, but current status is ${order.status}.`);
          // Decide if this is allowed or should return an error/warning
          // return res.status(400).json({ message: "Order must be shipped before it can be delivered." });
     }
     if (order.status === 'delivered') {
          return res.status(400).json({ message: "Order is already marked as delivered." });
     }


    order.status = "delivered";
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    console.log(`Order ${updatedOrder._id} marked as delivered by admin ${req.user.id}.`);
    // Consider sending delivery notification to user
    res.json(updatedOrder);

  } catch (err) {
    console.error("Update Delivery Status Error:", err);
    res.status(500).json({ error: "Failed to update order delivery status" });
  }
});

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status (Seller or Admin controlled)
 * @access  Private (Seller or Admin)
 */
// Combined protectSeller and protectAdmin logic might be better handled in middleware
// Or adjust access control as needed (e.g., only Admin can cancel?)
router.patch("/:id/status", protect, async (req, res) => { // Using general protect first
  const { status } = req.body;
  const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Authorization Check: Must be Admin OR Seller who has an item in the order
      const isSellerForItem = order.items.some((it) => it.seller && it.seller.equals(req.user.id));
      const isAdmin = req.user.isAdmin;

      // Allow if admin OR (is a seller AND is the seller for at least one item in this order)
      if (!isAdmin && !(req.user.isSeller && isSellerForItem)) {
        console.warn(`User ${req.user.id} (Admin: ${isAdmin}, Seller: ${req.user.isSeller}) tried to update status for order ${order._id} without permission.`);
        return res.status(403).json({ message: "Not authorized to update this order's status" });
      }

      // Optional: Add logic constraints (e.g., can't go from 'delivered' back to 'processing')
      // if (order.status === 'delivered' && status !== 'delivered') { ... }
      // if (order.status === 'cancelled' && status !== 'cancelled') { ... }

      order.status = status;
      // If setting to delivered, also set deliveredAt (though PUT /deliver is preferred for admin)
       if (status === 'delivered' && !order.deliveredAt) {
           order.deliveredAt = new Date();
       }
        // If cancelling, consider stock restoration logic? (Complex, might need separate flow)
        // if (status === 'cancelled' && order.status !== 'cancelled') { ... restore stock ... }


      await order.save();
      console.log(`Order ${order._id} status updated to ${status} by user ${req.user.id}.`);
      
      const io = req.app.get("io");
      if (io) {
        io.emit("order_update", {
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          user: order.user
        });
      }
      res.json(order.toObject()); // Return plain object

  } catch (err) {
       console.error(`Update Order Status Error (Order ID: ${req.params.id}, Status: ${status}):`, err);
       res.status(500).json({ error: "Failed to update order status" });
  }

});

/**
 * @route   POST /api/orders/:id/verify-razorpay
 * @desc    Verify Razorpay payment signature
 * @access  Private (User)
 */
router.post("/:id/verify-razorpay", protect, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: "Order is already paid" });
    }

    // Verify if it is a mock order
    const isMock = razorpay_order_id && razorpay_order_id.startsWith("mock_rzp_");

    if (isMock) {
      console.log("[RAZORPAY MOCK MODE] Verifying mock signature.");
      order.paymentStatus = "paid";
      order.paidAt = Date.now();
      order.status = "processing";
      order.paymentResult = {
        id: razorpay_payment_id || `mock_pay_${Date.now()}`,
        status: "succeeded",
        update_time: new Date().toISOString(),
        email_address: req.user.email || "mock@example.com",
      };
      await order.save();
      await handlePaymentSuccess(order, req);
      return res.json({ success: true, order });
    }

    const hasSecret = !!process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET !== 'placeholder_secret';
    if (!hasSecret) {
      return res.status(500).json({ message: "Razorpay secret is not configured on the server." });
    }

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      order.paymentStatus = "paid";
      order.paidAt = Date.now();
      order.status = "processing";
      order.paymentResult = {
        id: razorpay_payment_id,
        status: "succeeded",
        update_time: new Date().toISOString(),
        email_address: req.user.email || "payment@example.com",
      };
      await order.save();
      console.log(`Razorpay Payment verified for order ${order._id}`);
      await handlePaymentSuccess(order, req);
      res.json({ success: true, order });
    } else {
      console.error(`Invalid Razorpay signature for order ${order._id}`);
      res.status(400).json({ message: "Payment verification failed (signature mismatch)" });
    }
  } catch (err) {
    console.error("Razorpay Signature Verification Error:", err);
    res.status(500).json({ error: "Failed to verify Razorpay signature." });
  }
});

/**
 * @route   POST /api/orders/webhook/razorpay
 * @desc    Razorpay Webhook for payment events
 * @access  Public
 */
router.post("/webhook/razorpay", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET; 
    if (!secret) return res.status(500).send("Webhook secret missing");

    const signature = req.headers["x-razorpay-signature"];
    if (!signature) return res.status(400).send("Missing signature");

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());
    
    if (event.event === "order.paid") {
      const paymentEntity = event.payload.payment.entity;
      const rzpOrderId = paymentEntity.order_id;
      
      const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";
        order.paidAt = Date.now();
        order.status = "processing";
        order.paymentResult = {
          id: paymentEntity.id,
          status: paymentEntity.status,
          update_time: new Date().toISOString(),
          email_address: paymentEntity.email,
        };
        await order.save();
        console.log(`Webhook marked order ${order._id} as paid.`);
        
        await handlePaymentSuccess(order, req);
      }
    }
    
    res.status(200).send("OK");
  } catch (err) {
    console.error("Razorpay webhook error:", err);
    res.status(500).send("Internal Server Error");
  }
});

export default router;

