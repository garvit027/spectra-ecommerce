import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { api } from '../api/client';
import { CheckCircle, Loader2, AlertCircle, Package, MapPin, CreditCard, ArrowLeft, ListOrdered } from 'lucide-react';

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for orderId early
    if (!orderId || orderId === 'error' || orderId === 'unknown') { // Handle potential invalid IDs passed from redirect
      setError("Invalid or missing order ID.");
      setLoading(false);
      console.warn("OrderConfirmation: Invalid or missing orderId in URL.");
      return;
    }
    // Check for user token
    if (!user?.token) {
        console.warn("OrderConfirmation: No user token found, redirecting to login.");
        // Redirect to login, potentially passing the confirmation page as redirect destination
        navigate(`/login?redirect=/order-confirmation?orderId=${orderId}`, { replace: true });
        return;
    }

    let isMounted = true; // Flag to prevent state updates on unmounted component
    const fetchOrder = async () => {
      console.log(`OrderConfirmation: Attempting to fetch order details for ID: ${orderId}`);
      setLoading(true);
      setError(null);
      try {
        const fetchedOrder = await api.get(`/api/orders/${orderId}`, { token: user.token });
        if (isMounted) {
            console.log("OrderConfirmation: Fetched order successfully:", fetchedOrder);
            if (!fetchedOrder || !fetchedOrder._id) {
                 // Handle cases where API returns 200 OK but empty/invalid data
                 throw new Error("Received invalid order data from server.");
            }
            setOrder(fetchedOrder);
        }
      } catch (err) {
         if (isMounted) {
            console.error("OrderConfirmation: Failed to fetch order:", err);
            let specificError = err.message || "Failed to load order details.";
            // Handle specific HTTP status codes if provided by api client
            if (err.status === 404) {
                specificError = "Order not found. Please check the order ID or contact support.";
            } else if (err.status === 403) {
                specificError = "You are not authorized to view this order.";
            } else if (err.message?.includes("invalid ID format")) {
                 specificError = "The provided order ID is not valid.";
            }
            setError(specificError);
         }
      } finally {
        if (isMounted) {
            setLoading(false);
        }
      }
    };

    fetchOrder();

    // Cleanup function to set isMounted to false when component unmounts
    return () => {
        isMounted = false;
        console.log("OrderConfirmation: Component unmounted.");
    };

  }, [orderId, user, navigate]); // Dependencies

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-gray-600">
        <Loader2 className="animate-spin text-purple-600 mb-3" size={32} />
        <p>Loading your order details...</p>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-center px-4">
         <AlertCircle className="text-red-500 mb-3" size={40} />
        <p className="text-red-600 font-semibold mb-4 text-lg">Error Loading Order</p>
        <p className="text-gray-700 mb-6 max-w-md">{error}</p>
         <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
             <button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
                Go Home
            </button>
             <Link
                to="/profile?tab=orders"
                className="w-full sm:w-auto text-center px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
                View Order History
            </Link>
         </div>
      </div>
    );
  }

   // --- No Order Data State (after loading, without error) ---
  if (!order) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-center px-4">
             <AlertCircle className="text-yellow-500 mb-3" size={40} />
            <p className="text-gray-600 mb-6">Order details could not be loaded or are unavailable.</p>
             <button onClick={() => navigate('/')} className="mt-4 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                Go Home
            </button>
        </div>
    );
  }

  // --- Render Successful Order Details ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border border-green-200">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b border-gray-200">
            <CheckCircle className="mx-auto text-green-500 h-16 w-16 mb-3 animate-pulse" style={{ animationDuration: '1.5s' }}/>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Thank You For Your Order!</h1>
            <p className="text-gray-600 text-sm">
              Your order <span className="font-medium text-purple-700">#{order._id?.slice(-8).toUpperCase() || orderId}</span> has been placed successfully.
            </p>
             <p className="text-gray-500 text-xs mt-1">Placed on: {new Date(order.placedAt || order.createdAt).toLocaleString()}</p>
          </div>

          {/* Order Items */}
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Package className="mr-2 text-purple-600 flex-shrink-0" size={20}/> Items Ordered ({order.items?.length || 0})
            </h2>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2"> {/* Added scroll for many items */}
              {order.items?.map((item, index) => (
                <div key={item.product?._id || index} className="flex items-start space-x-4">
                  <img
                    src={item.image || `https://placehold.co/60x60/eee/ccc?text=${item.name ? item.name.charAt(0) : '?'}`}
                    alt={item.name || 'Product'}
                    className="w-14 h-14 object-cover rounded-md border border-gray-200 flex-shrink-0 bg-gray-50"
                     onError={(e) => e.target.src = 'https://placehold.co/60x60/f87171/ffffff?text=ERR'}
                  />
                  <div className="flex-1 text-sm min-w-0"> {/* Added min-w-0 for flex basis */}
                    <p className="font-medium text-gray-800 line-clamp-2 break-words">{item.name || 'Unknown Item'}</p>
                    <p className="text-gray-500">Qty: {item.qty || 1}</p>
                     {/* Display variant if available */}
                     {item.variant && <p className="text-gray-500 text-xs capitalize">Variant: {item.variant}</p>}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 whitespace-nowrap"> {/* Prevent wrapping */}
                    ₹{((item.price || 0) * (item.qty || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
               {!order.items?.length && <p className="text-sm text-gray-500">No items found in this order.</p>}
            </div>
          </div>

           {/* Shipping & Payment Summary */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border-b border-gray-200 pb-4">
               {/* Shipping Address */}
               <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                     <MapPin className="mr-2 text-purple-600 flex-shrink-0" size={20}/> Shipping To
                 </h2>
                  <div className="text-sm text-gray-700 space-y-1 bg-gray-50 p-4 rounded-md border border-gray-200 h-full"> {/* Added h-full */}
                     <p className="font-medium">{order.shippingAddress?.fullName || 'N/A'}</p>
                     <p>{order.shippingAddress?.address || 'N/A'}</p>
                     <p>{order.shippingAddress?.phone || 'N/A'}</p>
                  </div>
               </div>
                {/* Payment Summary */}
               <div>
                   <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                     <CreditCard className="mr-2 text-purple-600 flex-shrink-0" size={20}/> Payment Summary
                 </h2>
                   <div className="space-y-1.5 text-sm text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-200 h-full"> {/* Added h-full */}
                     <div className="flex justify-between">
                         <span>Subtotal:</span>
                         <span className="font-medium">₹{(order.subtotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-between">
                         <span>Shipping:</span>
                         <span className="font-medium">{(order.shipping ?? 0) === 0 ? "FREE" : `₹${(order.shipping ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                     </div>
                     <div className="flex justify-between">
                         <span>Tax:</span>
                         <span className="font-medium">₹{(order.tax ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-300 mt-2">
                         <span>Order Total:</span>
                         <span className="text-purple-700">₹{(order.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                      <p className={`text-xs pt-1.5 ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                         Payment Status: <span className="font-medium capitalize">{order.paymentStatus || 'Unknown'}</span>
                         {order.paymentMethod && <span className="text-gray-500"> ({order.paymentMethod})</span>}
                      </p>
                       <p className={`text-xs ${order.status === 'delivered' ? 'text-green-600' : 'text-blue-600'}`}>
                         Order Status: <span className="font-medium capitalize">{order.status || 'Unknown'}</span>
                      </p>
                   </div>
               </div>
           </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <ArrowLeft size={16} /> Continue Shopping
            </button>
            <Link
              to="/profile?tab=orders"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
               <ListOrdered size={16} /> View Order History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;

