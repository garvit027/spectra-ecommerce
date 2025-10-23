// src/components/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { useCart } from '../context/CartContext';

const Header = () => {
    const { user, loading, logout } = useAuth();
    const { state } = useCart();

    // Sum the total number of items in the cart
    const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <header className="bg-purple-600 text-white shadow-lg">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold font-display">
                    E-Commerce
                </Link>
                <nav className="flex items-center space-x-6">
                    <Link to="/admin" className="hover:text-purple-200 transition-colors duration-300">
                        Admin
                    </Link>
                    <Link to="/" className="hover:text-purple-200 transition-colors duration-300">
                        Products
                    </Link>
                    <Link to="/cart" className="relative hover:text-purple-200 transition-colors duration-300">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 1a1 1 0 000 2h.5c.66 0 1.25.59 1.15 1.25L5.75 8a.25.25 0 00.25.25h11a.25.25 0 00.25-.25l-.25-2.75A.25.25 0 0017 5.75H5.85L5 2.5a.25.25 0 00-.25-.25H3a1 1 0 000 2h.5zM7.5 17a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        </svg>
                        {totalItems > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                                {totalItems}
                            </span>
                        )}
                    </Link>
                    {!loading && (
                        user ? (
                            <button
                                onClick={logout}
                                className="bg-white text-purple-600 font-semibold py-2 px-4 rounded-full shadow hover:bg-gray-100 transition-colors duration-300"
                            >
                                Logout
                            </button>
                        ) : (
                            <Link to="/login" className="bg-white text-purple-600 font-semibold py-2 px-4 rounded-full shadow hover:bg-gray-100 transition-colors duration-300">
                                Login
                            </Link>
                        )
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Header;
