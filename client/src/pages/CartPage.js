import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { Trash2, Plus, Minus, CreditCard } from 'lucide-react';

const CartPage = () => {
  const navigate = useNavigate();
  // ✅ Correctly destructure from useCart() hook based on CartContext.js
  const { cartItems, dispatch } = useCart();

  // Handle case where context might still be initializing (though less likely with localStorage sync)
  if (!cartItems || !dispatch) {
     // You could show a loading indicator or a specific message
     console.warn("CartContext value not fully available yet.");
     // Render minimally or return null/loading indicator
     return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 mt-4 mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-700 mb-6 border-b pb-3">🛒 Your Shopping Cart</h2>
            <p className="text-center text-gray-500 py-10">Loading cart...</p>
        </div>
     );
  }

  const removeFromCart = (id) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: id });
  };

  const updateQuantity = (id, quantity, stock) => {
    // Prevent quantity from going below 1 or exceeding stock
    const newQuantity = Math.max(1, Math.min(quantity, stock || Infinity)); // Use Infinity if stock undefined
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity: newQuantity } });
  };

  const totalPrice = cartItems.reduce(
    (acc, item) => acc + (item.price || 0) * (item.quantity || 1),
    0
  );

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    navigate('/cart-checkout', {
      state: {
        cartItems: cartItems,
        totalPrice: totalPrice,
      }
    });
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 mt-4 mb-10">
      <h2 className="text-2xl sm:text-3xl font-bold text-purple-700 mb-6 border-b pb-3">🛒 Your Shopping Cart</h2>

      {cartItems.length === 0 ? (
        <div className="text-center py-10">
            <p className="text-gray-600 text-lg mb-4">Your cart is currently empty 😢</p>
            <button
                onClick={() => navigate('/')}
                className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
                Start Shopping
            </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cart Items List */}
          {cartItems.map((item) => (
            <div
              // Use product ID and potentially variant ID for a unique key
              key={item._id + (item.variant || '')}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 last:border-b-0"
            >
              {/* Product details */}
              <div className="flex items-start sm:items-center gap-4 w-full">
                <img
                  src={item.image || `https://placehold.co/80x80/eee/ccc?text=${item.name ? item.name.charAt(0) : '?'}`}
                  alt={item.name || 'Product Image'}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0 bg-gray-50"
                  onError={(e) => e.target.src = 'https://placehold.co/80x80/f87171/ffffff?text=ERR'}
                />
                <div className="flex-1 min-w-0"> {/* Prevents text overflow */}
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 line-clamp-2 break-words">{item.name || 'Unnamed Product'}</h3>
                  {/* Optional: Show variant */}
                  {item.variant && <p className="text-xs text-gray-500 capitalize">Variant: {item.variant}</p>}
                  <p className="text-purple-600 font-bold text-sm sm:text-base mt-1">
                    ₹{(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>

                  {/* ➖➕ Quantity controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity - 1, item.stock)}
                      className="p-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                       disabled={item.quantity <= 1}
                       aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span
                        className="px-3 py-1 border-t border-b border-gray-300 text-sm font-medium"
                        aria-label={`Current quantity: ${item.quantity}`}
                    >
                        {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity + 1, item.stock)}
                      className="p-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                       // Use item.stock if available in cart item
                       disabled={item.stock !== undefined && item.quantity >= item.stock}
                       aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                     {/* Optional: Show stock limit */}
                     {item.stock !== undefined && <span className="text-xs text-gray-400 ml-2">(Max: {item.stock})</span>}
                  </div>
                </div>
              </div>

              {/* Item Total & Remove Button */}
              <div className="flex flex-col items-end sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 ml-auto sm:ml-4 flex-shrink-0">
                 <p className="text-sm sm:text-base font-semibold text-gray-800 whitespace-nowrap">
                    ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </p>
                 <button
                    onClick={() => removeFromCart(item._id)}
                    className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors text-xs sm:text-sm font-medium p-1 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                    aria-label={`Remove ${item.name} from cart`}
                >
                    <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}

          {/* Cart Summary & Checkout Button */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <p className="text-lg font-semibold text-gray-800 mb-3 sm:mb-0">
              Total Amount: <span className="text-purple-700">₹{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            <button
              onClick={handleCheckout} // ✅ Added onClick handler
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              disabled={cartItems.length === 0} // Disable if cart is empty
            >
              <CreditCard size={18}/> Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;

