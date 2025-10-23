// src/components/ProductCard.jsx
import React from "react";
import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";

/**
 * A reusable card component to display product information.
 * It includes a link to the product details page and a button to add the product to the cart.
 * @param {object} product The product object to display.
 */
function ProductCard({ product }) {
  // Use the useCart hook to get the dispatch function from the CartContext
  const { dispatch } = useCart();

  // Function to handle adding the product to the cart
  const handleAddToCart = () => {
    // Dispatch an action to add the product to the cart state
    dispatch({ type: "ADD_TO_CART", payload: product });
  };

  // Check if the product has a valid image URL, otherwise use a placeholder
  const imageSrc = product.imageUrl?.trim() ? product.imageUrl : null;

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden hover:scale-105 transform transition-all duration-300">
      {/* Link to the product details page */}
      <Link to={`/product/${product._id}`}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-48 object-cover rounded"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">
            No Image
          </div>
        )}
      </Link>

      <div className="p-4">
        {/* Product name */}
        <h2 className="text-lg font-semibold text-gray-800">{product.name}</h2>
        {/* Product description */}
        <p className="text-sm text-gray-600">{product.description}</p>
        <div className="mt-2 flex justify-between items-center">
          {/* Product price */}
          <span className="text-purple-600 font-bold text-lg">
            ₹{product.price}
          </span>
          {/* Add to cart button */}
          <button
            onClick={handleAddToCart}
            className="bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 transition"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
