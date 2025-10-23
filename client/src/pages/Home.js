// /src/pages/Home.js
import React, { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("❌ Failed to fetch products:", error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="pt-4">
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-indigo-600 mb-4">
          🔥 Welcome to Spectra
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          One store, every vibe. From tech to kicks — curated just for you.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-8">
        {loading ? (
          <p className="text-center col-span-full">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-center col-span-full">No products found 🥲</p>
        ) : (
          products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))
        )}
      </section>
    </div>
  );
}