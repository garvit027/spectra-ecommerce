import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth, AuthProvider } from "./context/authContext";

// Component Imports
import Navbar from "./components/NavBar";
import ProductList from "./components/ProductList";
import ProductDetail from "./pages/ProductDetail";
import AddProduct from "./pages/AddProduct";
import AdminPanel from "./pages/AdminPanel";
import AdminDashboard from "./components/AdminDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import CartPage from "./pages/CartPage";
import Login from "./pages/Login";
import ProfilePage from "./pages/Profile";
import SellerApplicationStatus from "./pages/SellerApplicationStatus";
import AdminSellerReview from "./pages/AdminSellerReview";
import VerifiedPage from "./pages/VerifiedPage";
import RejectedPage from "./pages/RejectedPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import BuyNowCheckout from "./pages/BuyNowCheckout";
import CartCheckout from "./pages/CartCheckout";
import OrderConfirmation from "./pages/OrderConfirmation";
// ✅ Import the new Order History page
import OrderHistoryPage from "./pages/OrderHistory";

// Context Imports
import { CartProvider, useCart } from "./context/CartContext";
import { ToastProvider } from './components/Toast';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

// --- Route wrappers ---
const AdminRoute = ({ user, children }) =>
  user?.isAdmin ? children : <Navigate to="/login" replace />;
const PrivateRoute = ({ user, children }) =>
  user ? children : <Navigate to="/login" replace />;

function AppContent() {
  const { totalCount } = useCart();
  const cartCount = totalCount || 0;
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true); // Product loading state
  const [error, setError] = useState(null); // Product loading error
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();

  // Sync search term with URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('query');
    if (query !== null && query !== searchTerm) {
      setSearchTerm(query);
    }
  }, [location, searchTerm]);

  // Fetch products on initial component mount
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/products`);
        if (!res.ok) {
          const txt = await res.text().catch(() => `Status: ${res.status}`);
          throw new Error(`Server Error: ${txt}`);
        }
        const data = await res.json();
        if (isMounted) {
          const productArray = Array.isArray(data) ? data : data.products || data.data || [];
          setProducts(productArray);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
        if (isMounted) {
          setError(err.message || "Failed to fetch products. Please try again later.");
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchProducts();
    return () => { isMounted = false; }; // Cleanup on unmount
  }, []); // Empty dependency array means run once

  // Show loading spinner while auth state is being determined
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-600">Loading session...</p>
        {/* Consider adding a visual spinner */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-purple-100 text-gray-800 font-sans flex flex-col">
      <Navbar
        user={user}
        onLogout={logout}
        cartCount={cartCount}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      {/* Main content area */}
      <main className="flex-grow pt-20 sm:pt-24 px-4 max-w-7xl mx-auto w-full pb-10"> {/* Changed max-w-6xl to 7xl */}
        {/* Display global loading/error for products */}
         {loading && <p className="text-center py-10 text-gray-600">Loading products...</p>}
         {error && <p className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md shadow-sm border border-red-200">Error fetching products: {error}</p>}

        {/* Render routes only when not loading products and no error */}
        {!loading && !error && (
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<ProductList products={products} />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/seller-application-status" element={<SellerApplicationStatus />} />
                <Route path="/admin/seller-review/:token" element={<AdminSellerReview />} />
                <Route path="/verified-success" element={<VerifiedPage />} />
                <Route path="/rejected-status" element={<RejectedPage />} />

                {/* --- Private Routes --- */}
                <Route path="/buy-now-checkout" element={<PrivateRoute user={user}><BuyNowCheckout /></PrivateRoute>} />
                <Route path="/cart-checkout" element={<PrivateRoute user={user}><CartCheckout /></PrivateRoute>} />
                <Route path="/order-confirmation" element={<PrivateRoute user={user}><OrderConfirmation /></PrivateRoute>} />
                {/* ✅ ADDED: Dedicated Order History Route */}
                <Route path="/order-history" element={<PrivateRoute user={user}><OrderHistoryPage /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute user={user}><ProfilePage /></PrivateRoute>} />
                <Route path="/seller/dashboard" element={<PrivateRoute user={user}><SellerDashboard user={user} /></PrivateRoute>} />

                {/* --- Admin Routes --- */}
                <Route path="/admin" element={<AdminRoute user={user}><AdminPanel /></AdminRoute>} />
                <Route path="/admin/dashboard" element={<AdminRoute user={user}><AdminDashboard products={products} /></AdminRoute>} />
                <Route path="/admin/add" element={<AdminRoute user={user}><AddProduct setProducts={setProducts} /></AdminRoute>} />

                {/* --- 404 Not Found Route --- */}
                <Route path="*" element={
                        <div className="text-center py-20">
                            <h1 className="text-4xl font-bold text-red-600 mb-4">404</h1>
                            <p className="text-lg text-gray-700">Oops! Page not found.</p>
                            <button onClick={() => navigate('/')} className="mt-6 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                                Go Home
                            </button>
                        </div>
                    }
                />
            </Routes>
        )}
      </main>
      {/* Optional: Add a Footer component here if you have one */}
      {/* <Footer /> */}
    </div>
  );
}

// Main App component wrapping providers
export default function App() {
  return (
    <Router>
      <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </CartProvider>
      </AuthProvider>
    </Router>
  );
}

