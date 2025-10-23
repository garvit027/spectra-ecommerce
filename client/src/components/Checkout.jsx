// src/components/Checkout.jsx
import React from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';

const Checkout = () => {
    const { state, dispatch } = useCart();
    const { items } = state;

    // Calculate the total for display
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handlePlaceOrder = () => {
        // Placeholder for order placement logic
        alert('Order placed successfully! This is a placeholder.');
        dispatch({ type: 'CLEAR_CART' });
    };

    if (items.length === 0) {
        return (
            <div className="text-center mt-20 text-gray-600 text-lg">
                Your cart is empty. <Link to="/" className="text-purple-600 hover:underline">Start shopping!</Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold text-center text-purple-700 mb-8">Checkout</h1>
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Order Summary</h2>
                <ul className="space-y-4">
                    {items.map(item => (
                        <li key={item._id} className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <img
                                    src={item.imageUrl || 'https://placehold.co/60x60/E5E7EB/4B5563?text=No+Image'}
                                    alt={item.name}
                                    className="w-12 h-12 object-cover rounded-md"
                                />
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                                </div>
                            </div>
                            <span className="font-bold text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between font-bold text-xl text-purple-700">
                        <span>Total:</span>
                        <span>₹{total.toFixed(2)}</span>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Shipping Information</h2>
                    <form className="space-y-4">
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                        <textarea
                            placeholder="Shipping Address"
                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            rows="3"
                            required
                        ></textarea>
                        <input
                            type="text"
                            placeholder="Phone Number"
                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </form>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handlePlaceOrder}
                        className="w-full bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition duration-300 text-lg"
                    >
                        Place Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
