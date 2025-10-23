import React from "react";
import { Link } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function ProductList({ products, loading, error }) {
  if (loading) return <p className="text-center">⏳ Loading products...</p>;
  if (error) return <p className="text-center text-red-500">❌ {error}</p>;
  if (!products.length) return <p className="text-center">No products found.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((p) => {
        const imagePath = p.bannerImages?.[0] || p.images?.[0];

        // ✨ THIS IS THE CORRECTED LOGIC
        let imageUrl;
        if (imagePath?.startsWith('http')) {
          // If the path is already a full URL (like from the seeder), use it directly.
          imageUrl = imagePath;
        } else if (imagePath) {
          // If it's a local path (like '/uploads/image.jpg'), add the API_URL.
          imageUrl = `${API_URL}/${imagePath.startsWith('/') ? imagePath.substring(1) : imagePath}`;
        } else {
          // Otherwise, use a placeholder.
          imageUrl = "https://via.placeholder.com/300";
        }

        return (
          <Link
            key={p._id}
            to={`/product/${p._id}`}
            className="bg-white rounded-2xl shadow hover:shadow-lg transition p-4 flex flex-col"
          >
            <img
              src={imageUrl}
              alt={p.name}
              className="w-full h-48 object-cover rounded-xl"
            />
            <div className="mt-3">
              <h3 className="font-semibold text-lg line-clamp-1">{p.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{p.description}</p>
            </div>
            <div className="mt-auto flex items-center justify-between pt-3">
              <span className="text-purple-700 font-bold">₹{p.price}</span>
              <span className="text-sm text-gray-500">{p.rating?.toFixed?.(1) || 0}★ ({p.numReviews || 0})</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}