import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './context/authContext';  // Add this import
import { CartProvider } from './context/CartContext';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AuthProvider> {/* Auth context wraps everything */}
      <CartProvider> {/* Cart context inside Auth context */}
        <App />
      </CartProvider>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();