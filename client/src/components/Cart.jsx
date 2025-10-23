// src/components/Cart.jsx
import React from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';

const Cart = () => {
    const { state, dispatch } = useCart();
    const { items } = state;

    // Calculate subtotal
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    // Add a simple tax calculation (e.g., 10%)
    const tax = subtotal * 0.10;
    // Calculate final total
    const total = subtotal + tax;

    const handleUpdateQuantity = (id, quantity) => {
        dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
    };

    const handleRemoveItem = (id) => {
        dispatch({ type: 'REMOVE_ITEM', payload: id });
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold text-center text-purple-700 mb-8">Your Shopping Cart</h1>
            {items.length === 0 ? (
                <div className="text-center text-gray-600 text-lg mt-10">
                    Your cart is empty. <Link to="/" className="text-purple-600 hover:underline">Start shopping!</Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="space-y-6">
                        {items.map(item => (
                            <div key={item._id} className="flex items-center space-x-4 border-b pb-4 last:border-b-0 last:pb-0">
                                <img
                                    src={item.imageUrl || 'https://placehold.co/100x100/E5E7EB/4B5563?text=No+Image'}
                                    alt={item.name}
                                    className="w-24 h-24 object-cover rounded-lg"
                                />
                                <div className="flex-grow">
                                    <h2 className="text-lg font-semibold text-gray-800">{item.name}</h2>
                                    <p className="text-purple-600 font-bold">₹{item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-300 disabled:opacity-50"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                                        className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-300"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="font-bold text-gray-800 w-24 text-right">
                                    ₹{(item.price * item.quantity).toFixed(2)}
                                </div>
                                <button
                                    onClick={() => handleRemoveItem(item._id)}
                                    className="text-red-500 hover:text-red-700 transition"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="flex justify-between font-semibold text-gray-800">
                            <span>Subtotal:</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 mt-2">
                            <span>Tax (10%):</span>
                            <span>₹{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xl text-purple-700 mt-4">
                            <span>Total:</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <Link to="/checkout" className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition duration-300 text-lg">
                            Proceed to Checkout
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
