// server/app.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

// --- Routes ---
import userRoutes from "./routes/user.js";
import productRoutes from "./routes/productsRoutes.js";
import adminRoutes from "./routes/admin.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";   

// --- Middleware imports ---
import { protect, protectSeller, protectAdmin } from "./middlewares/authMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// --- Middleware ---
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
  })
);
app.use(express.json());

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

// --- Routes ---
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/orders", orderRoutes);  // ✅ attach order routes

// --- Protected Test Route ---
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "Protected route accessed!", userId: req.user.id });
});

// --- Healthcheck ---
app.get("/", (req, res) => res.send("Spectra-commerce-ai API is running..."));

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

export default app;