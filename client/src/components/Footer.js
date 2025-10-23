// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-purple-600 text-white py-6">
            <div className="container mx-auto px-4 text-center">
                <p>&copy; {new Date().getFullYear()} E-Commerce. All rights reserved.</p>
                <p className="text-sm mt-2">Built with ❤️ and React.</p>
            </div>
        </footer>
    );
};

export default Footer;
