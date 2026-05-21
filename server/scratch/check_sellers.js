import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function checkSellers() {
  await mongoose.connect(process.env.MONGO_URI);
  const sellers = await User.find({ isSeller: true });
  console.log("Sellers found:", sellers.map(s => ({ name: s.name, email: s.email, status: s.sellerStatus, isSeller: s.isSeller })));
  process.exit(0);
}

checkSellers();
