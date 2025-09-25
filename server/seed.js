import mongoose from "mongoose";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";
import Product from "./models/Product.js";
import User from "./models/User.js";
import fetch from "node-fetch";

dotenv.config();

// Hardcoded seed product for consistency
const seedProducts = [
  {
    name: "Premium Wireless Headphones",
    brand: "AudioTech Pro",
    description: "Flagship ANC headphones with rich sound.",
    price: 2999,
    originalPrice: 3999,
    discount: 25,
    category: "Headphones",
    stock: 23,
    stockCount: 23,
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=1200&fit=crop",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1200&h=1200&fit=crop",
    ],
    variants: [
      { id: "1", name: "Midnight Black", color: "#000000", inStock: true },
      { id: "2", name: "Space Gray", color: "#4a5568", inStock: true },
    ],
    specifications: {
      "Driver Size": "40mm",
      Bluetooth: "5.3",
      Battery: "40h",
    },
    status: "approved",
  },
];

// Function to get a random image URL from Unsplash API
const getUnsplashImage = async (query) => {
  const url = `https://api.unsplash.com/photos/random?query=${query}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.urls.regular;
  } catch (error) {
    console.error(`❌ Error fetching image for query "${query}":`, error.message);
    return null;
  }
};

// Function to generate a single random product
const generateRandomProduct = async () => {
  const categories = ["Laptops", "Smartphones", "Cameras", "Headphones", "Gaming Consoles"];
  const name = `${faker.commerce.productAdjective()} ${faker.commerce.product()}`;
  const description = faker.commerce.productDescription();
  const originalPrice = faker.number.int({ min: 1000, max: 15000 });
  const price = faker.number.int({ min: Math.round(originalPrice * 0.7), max: originalPrice - 1 });
  const discount = Math.round(((originalPrice - price) / originalPrice) * 100);

  const electronicSpecs = {
    Processor: `${faker.word.adjective()} Core ${faker.number.int({ min: 3, max: 9 })}`,
    RAM: `${faker.number.int({ min: 4, max: 32 })}GB`,
    Storage: `${faker.number.int({ min: 128, max: 2048 })}GB SSD`,
    Display: `${faker.number.float({ min: 10, max: 20, precision: 0.1 })}" LED`,
    "Battery Life": `${faker.number.int({ min: 5, max: 20 })} hours`,
  };

  const image1 = await getUnsplashImage("electronics");
  const image2 = await getUnsplashImage("tech gadget");
  const images = [image1, image2].filter(Boolean); // Filters out any nulls if API fails

  return {
    name,
    brand: faker.company.name(),
    description,
    price,
    originalPrice,
    discount,
    category: faker.helpers.arrayElement(categories),
    stock: faker.number.int({ min: 10, max: 200 }),
    stockCount: faker.number.int({ min: 10, max: 200 }),
    images,
    variants: [
      { id: "1", name: "Black", color: "#000000", inStock: true },
      { id: "2", name: "Silver", color: "#c0c0c0", inStock: true },
    ],
    specifications: electronicSpecs,
    status: "approved",
  };
};

// The main seeding function
const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || "spectra",
    });
    console.log("✅ MongoDB connected for seeding");

    const seller = await User.findOne({ isSeller: true });
    if (!seller) {
      console.log("⚠️ No seller found. Products will be seeded without a seller.");
    }

    await Product.deleteMany({});
    console.log("🗑️ Old products removed");

    console.log("⏳ Generating 49 random products...");
    const productPromises = Array.from({ length: 49 }, generateRandomProduct);
    const randomProducts = await Promise.all(productPromises);
    
    const allProducts = [...seedProducts, ...randomProducts];

    const productsToInsert = allProducts.map((p) => ({
      ...p,
      seller: seller?._id || undefined,
      // ✨ This is the perfect logic to set the first image as the banner image
      bannerImages: p.images && p.images.length > 0 ? [p.images[0]] : [],
    }));
    
    const seeded = await Product.insertMany(productsToInsert);

    console.log(`✅ Inserted ${seeded.length} products`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
};

seedDB();