// src/components/product/ProductBuyBox.jsx
import React, { useState } from "react";
import { FaShoppingCart } from "react-icons/fa";
import ProductQuantitySelector from "./ProductQuantitySelector";

export default function ProductBuyBox({ product, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-fit sticky top-24 transform transition-all duration-300 hover:shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="text-3xl font-bold text-purple-700">₹{product.price}</div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${product.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {product.stock > 0 ? "In Stock" : "Out of Stock"}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-semibold text-gray-800">Quantity</span>
        <ProductQuantitySelector quantity={quantity} setQuantity={setQuantity} stock={product.stock} />
      </div>

      <button
        className="mt-6 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full py-4 font-semibold disabled:opacity-50 transition-colors duration-200"
        disabled={product.stock <= 0}
        onClick={() => onAddToCart(quantity)}
      >
        <FaShoppingCart /> Add to Cart
      </button>

      <div className="mt-4 text-sm text-gray-600">
        <p className="flex items-center gap-2">
          <span className="text-green-500">✓</span> Secure checkout & easy returns.
        </p>
        <p className="flex items-center gap-2">
          <span className="text-green-500">✓</span> Free shipping on all orders.
        </p>
      </div>
    </div>
  );
}