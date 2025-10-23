import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { api } from "../api/client";
import { Loader2, AlertCircle, ListOrdered, Package, ArrowLeft } from 'lucide-react';

// New component dedicated to showing order history
function OrderHistoryPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);

  // Fetch Order History
  useEffect(() => {
    let isMounted = true;
    if (user?.token) {
      const fetchOrders = async () => {
        console.log("OrderHistoryPage: Fetching order history...");
        setOrdersLoading(true);
        setOrdersError(null);
        try {
          const data = await api.get("/api/orders/mine", { token: user.token });
          if (isMounted) {
            console.log("OrderHistoryPage: Orders fetched successfully.", data);
            setOrders(Array.isArray(data) ? data : []);
          }
        } catch (err) {
          console.error("OrderHistoryPage: Failed to fetch orders:", err);
           if (isMounted) {
               let errorMsg = "Could not load order history.";
               if (err.status === 401) {
                   errorMsg = "Session expired. Please log in again.";
                   logout(); // Logout on auth error
                   navigate('/login'); // Redirect to login
               } else if (err.message) {
                   errorMsg = err.message;
               }
               setOrdersError(errorMsg);
           }
        } finally {
          if (isMounted) {
            setOrdersLoading(false);
          }
        }
      };
      fetchOrders();
    } else if (!authLoading) {
        // If auth check is done and still no token, redirect
        console.warn("OrderHistoryPage: No user token, redirecting to login.");
        navigate('/login', { replace: true });
    }

    // Cleanup function
    return () => { isMounted = false; };
  }, [user, authLoading, logout, navigate]); // Rerun if user changes

   // Loading state for initial auth check
   if (authLoading) {
       return (
            <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
                <Loader2 className="animate-spin text-purple-600 mr-3" size={24} />
                <p className="text-lg text-gray-600">Loading your orders...</p>
            </div>
       );
   }

  // --- Render Component ---
  return (
    <div className="max-w-4xl mx-auto mt-8 sm:mt-12 mb-10 px-4">
        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-purple-700 flex items-center gap-2">
                    <ListOrdered size={28}/> Order History
                </h2>
                 <button
                    onClick={() => navigate('/')} // Or navigate(-1) to go back
                    className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 focus:outline-none"
                 >
                    <ArrowLeft size={16}/> Back to Shop
                 </button>
            </div>

            {/* Loading State */}
            {ordersLoading && (
                <div className="flex items-center justify-center py-10 text-gray-600">
                <Loader2 className="animate-spin mr-3" size={20} />
                <span>Loading orders...</span>
                </div>
            )}

            {/* Error State */}
            {ordersError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
                <p><strong className="font-bold">Error:</strong> {ordersError}</p>
                </div>
            )}

            {/* Empty State */}
            {!ordersLoading && !ordersError && orders.length === 0 && (
                <p className="text-center text-gray-500 py-10">You haven't placed any orders yet.</p>
            )}

            {/* Orders List */}
            {!ordersLoading && !ordersError && orders.length > 0 && (
                <div className="space-y-6">
                {orders.map((order) => (
                    <div key={order._id} className="border border-gray-200 rounded-lg p-4 transition-shadow hover:shadow-md">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 pb-2 border-b border-gray-100 gap-2 sm:gap-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Order Placed</p>
                                <p className="text-sm font-medium text-gray-700">{new Date(order.placedAt || order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-left sm:text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                                <p className="text-sm font-medium text-gray-700">₹{(order.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Order #</p>
                                <p className="text-sm font-mono text-gray-600 break-all">{order._id}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                             {/* Order Status Badge */}
                            <p className={`text-xs sm:text-sm font-medium capitalize px-2.5 py-1 rounded-full inline-block ${
                                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800' // pending or default
                            }`}>
                                Status: {order.status}
                            </p>
                             {/* Payment Status */}
                             <p className={`text-xs capitalize font-medium ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                                Payment: {order.paymentStatus}
                            </p>
                        </div>

                        {/* Simplified Item Display */}
                        {order.items?.slice(0, 1).map((item, index) => ( // Show only first item preview
                            <div key={item.product?._id || index} className="flex items-center space-x-3 mb-2 opacity-90">
                                <img
                                    src={item.image || `https://placehold.co/40x40/eee/ccc?text=?`}
                                    alt={item.name || 'Item'}
                                    className="w-10 h-10 object-cover rounded border border-gray-100 bg-gray-50"
                                />
                                <div className="flex-1 text-xs">
                                    <p className="font-medium text-gray-700 line-clamp-1">{item.name || 'Item Name'}</p>
                                    <p className="text-gray-500">Qty: {item.qty || 1}</p>
                                </div>
                            </div>
                        ))}
                        {order.items?.length > 1 && <p className="text-xs text-gray-500 ml-13"> + {order.items.length - 1} more item(s)</p>}

                        {/* Link to Order Details */}
                        <div className="text-right mt-2">
                             <Link
                                to={`/order-confirmation?orderId=${order._id}`} // Link to the existing confirmation page
                                className="text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline focus:outline-none focus:ring-1 focus:ring-purple-500 rounded"
                            >
                                View Order Details
                            </Link>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </div>
    </div>
  );
}

export default OrderHistoryPage;
