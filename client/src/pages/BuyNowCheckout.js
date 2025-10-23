import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { api } from '../api/client'; // Assuming api client handles fetch/auth
import { ShoppingBag, Loader2, CreditCard, MapPin, Package, AlertCircle } from 'lucide-react';

const BuyNowCheckout = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Initialize address state from user context
  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || '',
    address: user?.address || '',
    phone: user?.phone || '',
  });

  // Effect to sync address form if user data loads/updates *after* initial mount
  useEffect(() => {
    // Only update if the form hasn't potentially been edited by the user yet
    if (user && !shippingAddress.fullName && user.name) {
      setShippingAddress({
        fullName: user.name || '',
        address: user.address || '',
        phone: user.phone || '',
      });
    }
  }, [user]); // Rerun when user object loads/changes


  // Redirect if essential data is missing or user logs out
  useEffect(() => {
    if (!state?.productId) {
      console.warn("BuyNowCheckout: Missing product data in location state. Redirecting home.");
      navigate('/', { replace: true });
    }
    // PrivateRoute should handle logged-out users, but check again
    if (!user) {
        console.warn("BuyNowCheckout: No user found. Redirecting to login.");
        navigate('/login', { replace: true });
    }
  }, [state, navigate, user]);

  // Render loading/redirect state
  // Added check for user as well, in case context takes time
  if (!user || !state?.productId) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Loader2 className="animate-spin text-purple-600 mr-2" size={24} />
        <p className="text-gray-600">Loading checkout...</p>
      </div>
    );
  }

  // Destructure product data after checks
  const { productId, quantity = 1, variant, price, name, image, sellerId } = state;
  const subtotal = (price || 0) * (quantity || 1);
  const shippingCost = 0; // Placeholder - implement actual calculation if needed
  const tax = 0; // Placeholder - implement actual calculation if needed
  const total = subtotal + shippingCost + tax;

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async () => {
    setError(null);
    setLoading(true);
    console.log("handlePlaceOrder: Attempting to place order..."); // Log start

    if (!user) {
      setError("Authentication error. Please log in again.");
      setLoading(false);
      console.error("handlePlaceOrder: No user object found."); // Log error
      navigate('/login'); // Redirect to login if user somehow nullified
      return;
    }

    // Basic validation
    if (!shippingAddress.fullName?.trim() || !shippingAddress.address?.trim() || !shippingAddress.phone?.trim()) {
        setError("Please fill in all required shipping address details.");
        setLoading(false);
        console.warn("handlePlaceOrder: Missing shipping address fields."); // Log warning
        return;
    }
     // Optional: More specific phone validation
     if (!/^\d{10}$/.test(shippingAddress.phone.trim())) {
         setError("Please enter a valid 10-digit phone number.");
         setLoading(false);
         console.warn("handlePlaceOrder: Invalid phone number format."); // Log warning
         return;
     }

    try {
      const orderBody = {
        items: [{
          product: productId,
          name: name,
          price: price, // price per item
          qty: quantity,
          seller: sellerId,
          image: image,
          variant: variant?.name || null, // Send variant name if exists
        }],
        shippingAddress: { // Ensure this matches backend model exactly
            fullName: shippingAddress.fullName.trim(),
            address: shippingAddress.address.trim(),
            phone: shippingAddress.phone.trim(),
        },
        subtotal: subtotal,
        shipping: shippingCost,
        tax: tax,
        total: total,
        // paymentMethod: 'COD' // Explicitly set if using default
      };

      console.log("handlePlaceOrder: Sending POST /api/orders with body:", JSON.stringify(orderBody, null, 2)); // Log body

      // Use the api client, passing the token
      const newOrder = await api.post("/api/orders", orderBody, { token: user.token });

      console.log("handlePlaceOrder: Order placed successfully, response:", newOrder); // Log success

      // ✅ Redirect to the order confirmation page on success
      navigate(`/order-confirmation?orderId=${newOrder?._id || "error"}`, { replace: true });

    } catch (e) {
      // Log the detailed error
      console.error("handlePlaceOrder: Failed to place order. Error object:", e);
      // Try to get a more specific message
      let errorMessage = "An unknown error occurred while placing the order. Please try again.";
      if (e?.status === 401) {
          errorMessage = "Your session may have expired. Please log in again.";
          // Optionally logout user here if desired
          // logout();
          navigate('/login'); // Redirect on auth error
      } else if (e?.message) {
          // If the error object has a message property (common for fetch errors or custom errors)
          errorMessage = e.message;
      } else if (typeof e === 'string') {
          // If the caught error is just a string
          errorMessage = e;
      }
      setError(`Failed to place order: ${errorMessage}`);
    } finally {
      setLoading(false);
      console.log("handlePlaceOrder: Process finished."); // Log end
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-purple-100 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 flex items-center">
          <ShoppingBag className="mr-3 text-purple-600" size={32} />
          Complete Your Purchase
        </h1>

        {/* --- Error Display --- */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md relative mb-6 shadow-sm" role="alert">
            <div className="flex">
                <div className="py-1"><AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" /></div>
                <div>
                    <p className="font-bold">Error Placing Order</p>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* --- Left Column: Order Summary & Address --- */}
          <div className="md:col-span-2 space-y-8">
             {/* --- Order Summary --- */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="mr-2 text-purple-600" size={20} />
                    Order Summary
                </h2>
                <div className="flex items-start sm:items-center space-x-4">
                <img
                    src={image || 'https://placehold.co/80x80/E5E7EB/4B5563?text=N/A'}
                    alt={name || 'Product'}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0 bg-gray-50"
                    onError={(e) => e.target.src = 'https://placehold.co/80x80/f87171/ffffff?text=Error'}
                />
                <div className="flex-1 min-w-0"> {/* Prevents overflow */}
                    <h3 className="font-medium text-base sm:text-lg text-gray-800 line-clamp-2 break-words">{name || 'Product Name Missing'}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Qty: {quantity} {variant?.name && `| Color: ${variant.name}`} {/* Display variant name */}
                    </p>
                    <p className="font-semibold text-purple-700 mt-1 text-sm sm:text-base">
                    Item Total: ₹{(price * quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                </div>
            </div>

             {/* --- Shipping Address --- */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="mr-2 text-purple-600" size={20} />
                    Shipping Address
                </h2>
                {/* Form now submits via handlePlaceOrder button, not standalone */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={shippingAddress.fullName}
                        onChange={handleAddressChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150"
                        required
                        aria-required="true"
                        autoComplete="name"
                        />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Full Address (Street, City, State, PIN)</label>
                        <textarea
                        id="address"
                        name="address"
                        value={shippingAddress.address}
                        onChange={handleAddressChange}
                        rows="3"
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150"
                        required
                        aria-required="true"
                        placeholder="e.g., 123 Main St, Anytown, ST 12345"
                        autoComplete="street-address"
                        ></textarea>
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">10-Digit Phone Number</label>
                        <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={shippingAddress.phone}
                        onChange={handleAddressChange}
                         maxLength={10} // Enforce max length
                         pattern="\d{10}" // Basic pattern validation
                         title="Please enter a 10-digit phone number"
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150"
                        required
                        aria-required="true"
                        autoComplete="tel"
                        />
                    </div>
                </div>
            </div>
          </div>

          {/* --- Right Column: Payment Details & Actions --- */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 h-fit sticky top-24"> {/* Adjusted top for navbar */}
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <CreditCard className="mr-2 text-purple-600" size={20} />
                    Payment Summary
                </h2>
                {/* --- Totals --- */}
                <div className="space-y-2 text-sm text-gray-700 mb-6">
                <div className="flex justify-between">
                    <span>Subtotal ({quantity} item{quantity > 1 ? 's' : ''})</span>
                    <span className="font-medium">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-medium">{shippingCost === 0 ? "FREE" : `₹${shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-200">
                    <span>Estimated Tax</span>
                    <span className="font-medium">₹{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pt-3 font-bold text-lg text-gray-900">
                    <span>Order Total</span>
                    <span>₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                </div>

                {/* --- Payment Method --- */}
                 {/* This section needs real integration (e.g., Stripe Elements) */}
                <div className="mb-6">
                     <p className="font-medium text-gray-800 mb-2 text-sm">Payment Method</p>
                     <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <label className="flex items-center cursor-pointer">
                        <input type="radio" name="paymentMethod" value="cod" className="form-radio h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500" defaultChecked readOnly/>
                        <span className="ml-2 text-sm text-gray-700">Cash on Delivery (COD)</span>
                        </label>
                        {/* Add other methods here, e.g., Stripe */}
                        <label className="flex items-center cursor-not-allowed opacity-50">
                        <input type="radio" name="paymentMethod" value="card" className="form-radio h-4 w-4 text-purple-600 border-gray-300" disabled />
                        <span className="ml-2 text-sm text-gray-500">Credit/Debit Card (Coming Soon)</span>
                        </label>
                    </div>
                </div>


                {/* --- Action Buttons --- */}
                <div className="space-y-3">
                    <button
                    onClick={handlePlaceOrder}
                    // Disable if loading, no user, or required address fields empty
                    disabled={loading || !user || !shippingAddress.fullName?.trim() || !shippingAddress.address?.trim() || !shippingAddress.phone?.trim()}
                    className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                    <span>{loading ? 'Processing...' : 'Place Order'}</span>
                    </button>
                    <button
                        onClick={() => navigate(`/product/${productId}`)} // Go back to product detail page
                        className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyNowCheckout;

