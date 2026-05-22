// server/app.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

// --- Routes ---
import userRoutes from "./routes/user.js";
import productRoutes from "./routes/productsRoutes.js";
import adminRoutes from "./routes/admin.js";
import orderRoutes from "./routes/orderRoutes.js";   
import sellerRoutes from "./routes/sellerRoutes.js";

// --- Middleware imports ---
import { protect, protectSeller, protectAdmin } from "./middlewares/authMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// --- Socket.io Setup ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://spectra-ecommerce.vercel.app"
    ],
    credentials: true,
  }
});
app.set("io", io);

// --- Middleware ---
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://spectra-ecommerce.vercel.app"
    ],
    credentials: true,
  })
);

// Specifically for Razorpay webhook, parse raw body for signature verification
app.use('/api/orders/webhook/razorpay', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// --- DB Connection ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || "spectra",
    });
    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};
connectDB();

// --- Normalize URL Double Slashes ---
app.use((req, res, next) => {
  req.url = req.url.replace(/\/+/g, '/');
  next();
});

// --- Routes ---
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);  // ✅ attach order routes
app.use("/api/seller", sellerRoutes);

// --- Protected Test Route ---
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "Protected route accessed!", userId: req.user.id });
});

// --- Healthcheck ---
app.get("/", (req, res) => res.send("Spectra-commerce-ai API is running..."));

// --- Start Server ---
httpServer.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

export default app;