import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { useCart } from '../context/CartContext'; // Import useCart to clear cart on success
import { api } from '../api/client';
import { ShoppingBag, Loader2, CreditCard, MapPin, Package, AlertCircle } from 'lucide-react';

const CartCheckout = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dispatch: cartDispatch } = useCart(); // Get cart dispatch function

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Initialize address state from user context
  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || '',
    address: user?.address || '',
    phone: user?.phone || '',
  });

  // Extract cart items and total price from location state
  const cartItems = state?.cartItems || [];
  const totalPriceFromCart = state?.totalPrice || 0; // Use the total passed from cart

  // Effect to sync address form if user data loads/updates
  useEffect(() => {
    if (user && !shippingAddress.fullName && user.name) {
       console.log("CartCheckout: Syncing address form with user data.", user);
      setShippingAddress({
        fullName: user.name || '',
        address: user.address || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Redirect if cart is empty or user logs out
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      console.warn("CartCheckout: Cart items missing in location state or cart is empty. Redirecting to cart.");
      navigate('/cart', { replace: true }); // Go back to cart if empty
      return;
    }
    if (!user) {
        console.warn("CartCheckout: No user found. Redirecting to login.");
        navigate('/login', { replace: true });
    }
  }, [cartItems, navigate, user]);

  // Render loading/redirect state (if user is initially null)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Loader2 className="animate-spin text-purple-600 mr-2" size={24} />
        <p className="text-gray-600">Loading checkout...</p>
      </div>
    );
  }

  // Calculate totals (can also use totalPriceFromCart, but recalculating ensures consistency)
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const shippingCost = 0; // Placeholder
  const tax = 0; // Placeholder
  const total = subtotal + shippingCost + tax; // Use recalculated total

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async () => {
    setError(null);
    setLoading(true);
    console.log("CartCheckout - handlePlaceOrder: Attempting to place order...");

    if (!user || !user.token) {
      setError("Authentication error. Please log in again.");
      setLoading(false);
      console.error("CartCheckout - handlePlaceOrder: No user object or token found.");
      navigate('/login');
      return;
    }

    // Validation
    const trimmedFullName = shippingAddress.fullName?.trim();
    const trimmedAddress = shippingAddress.address?.trim();
    const trimmedPhone = shippingAddress.phone?.trim();

    if (!trimmedFullName || !trimmedAddress || !trimmedPhone) {
        setError("Please fill in all required shipping address details.");
        setLoading(false);
        console.warn("CartCheckout - handlePlaceOrder: Validation failed - Missing shipping address fields.");
        return;
    }
     if (!/^\d{10}$/.test(trimmedPhone)) {
         setError("Please enter a valid 10-digit phone number.");
         setLoading(false);
         console.warn("CartCheckout - handlePlaceOrder: Validation failed - Invalid phone number format.");
         return;
     }

    try {
        // Prepare items array matching the backend OrderItemSchema
       const orderItems = cartItems.map(item => ({
            product: item._id, // Use _id from cart item
            name: item.name,
            price: item.price, // Price per item
            qty: item.quantity,
            seller: item.seller, // Ensure seller ID is in cart item
            image: item.image,
            variant: item.variant || null, // Include variant if present
        }));

      const orderBody = {
        items: orderItems, // Use the prepared items array
        shippingAddress: {
            fullName: trimmedFullName,
            address: trimmedAddress,
            phone: trimmedPhone,
        },
        subtotal: subtotal,
        shipping: shippingCost,
        tax: tax,
        total: total,
        // paymentMethod: 'COD' // Default payment method
      };

      console.log("CartCheckout - handlePlaceOrder: Sending POST /api/orders. Body:", JSON.stringify(orderBody, null, 2));

      const newOrder = await api.post("/api/orders", orderBody, { token: user.token });

      console.log("CartCheckout - handlePlaceOrder: API call successful. Response:", newOrder);

      if (newOrder && newOrder._id) {
          console.log(`CartCheckout - handlePlaceOrder: Order created with ID: ${newOrder._id}. Clearing cart and navigating.`);
          // Clear the cart after successful order placement
          cartDispatch({ type: 'CLEAR_CART' });
          // Redirect to confirmation page
          navigate(`/order-confirmation?orderId=${newOrder._id}`, { replace: true });
      } else {
          console.error("CartCheckout - handlePlaceOrder: API response missing expected '_id'. Response:", newOrder);
          setError("Order placed, but failed to get confirmation ID. Please check your order history.");
      }

    } catch (e) {
      console.error("CartCheckout - handlePlaceOrder: CATCH block - Failed to place order. Error:", e);
      let errorMessage = "An unknown error occurred. Please try again.";
      if (e?.status === 401) {
          errorMessage = "Your session may have expired. Please log in again.";
          navigate('/login');
      } else if (e?.message) {
          errorMessage = e.message;
      } else if (e?.error) {
          errorMessage = e.error;
      }
      setError(`Failed to place order: ${errorMessage}`);
    } finally {
      setLoading(false);
      console.log("CartCheckout - handlePlaceOrder: Process finished.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-purple-100 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 flex items-center">
          <ShoppingBag className="mr-3 text-purple-600" size={32} />
          Checkout ({cartItems.length} Item{cartItems.length !== 1 ? 's' : ''})
        </h1>

        {/* --- Error Display --- */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md relative mb-6 shadow-sm" role="alert">
            <div className="flex">
                <div className="py-1"><AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" /></div>
                <div>
                    <p className="font-bold">Checkout Error</p>
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
                {/* Scrollable list for multiple items */}
                <div className="space-y-4 max-h-72 overflow-y-auto pr-2 border-b border-gray-200 pb-4 mb-4">
                    {cartItems.map((item, index) => (
                         <div key={item._id + (item.variant || index)} className="flex items-start space-x-4">
                            <img
                                src={item.image || `https://placehold.co/80x80/eee/ccc?text=${item.name ? item.name.charAt(0) : '?'}`}
                                alt={item.name || 'Product'}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0 bg-gray-50"
                                onError={(e) => e.target.src = 'https://placehold.co/80x80/f87171/ffffff?text=ERR'}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-800 line-clamp-2 break-words">{item.name || 'Unnamed Product'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                Qty: {item.quantity} {item.variant && `| ${item.variant}`}
                                </p>
                            </div>
                            <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                                ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    ))}
                </div>
                 {/* Total summary within the box */}
                 <div className="text-right text-base font-semibold text-gray-800">
                    Subtotal: <span className="text-purple-700">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                 </div>
            </div>

             {/* --- Shipping Address --- */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="mr-2 text-purple-600" size={20} />
                    Shipping Address
                </h2>
                <div className="space-y-4">
                    {/* Reusing the same form structure */}
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" id="fullName" name="fullName" value={shippingAddress.fullName} onChange={handleAddressChange} className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150" required aria-required="true" autoComplete="name"/>
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                        <textarea id="address" name="address" value={shippingAddress.address} onChange={handleAddressChange} rows="3" className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150" required aria-required="true" placeholder="Street, City, State, PIN" autoComplete="street-address"></textarea>
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">10-Digit Phone</label>
                        <input type="tel" id="phone" name="phone" value={shippingAddress.phone} onChange={handleAddressChange} maxLength={10} pattern="\d{10}" title="Enter a 10-digit phone number" className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150" required aria-required="true" autoComplete="tel"/>
                    </div>
                </div>
            </div>
          </div>

          {/* --- Right Column: Payment Details & Actions --- */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 h-fit sticky top-24">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <CreditCard className="mr-2 text-purple-600" size={20} />
                    Payment Summary
                </h2>
                {/* Totals */}
                <div className="space-y-2 text-sm text-gray-700 mb-6">
                    <div className="flex justify-between"><span>Subtotal</span> <span className="font-medium">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>Shipping</span> <span className="font-medium">{shippingCost === 0 ? "FREE" : `₹${shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span></div>
                    <div className="flex justify-between pb-3 border-b border-gray-200"><span>Est. Tax</span> <span className="font-medium">₹{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between pt-3 font-bold text-lg text-gray-900"><span>Order Total</span> <span className="text-purple-700">₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                </div>
                {/* Payment Method */}
                <div className="mb-6">
                     <p className="font-medium text-gray-800 mb-2 text-sm">Payment Method</p>
                     <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <label className="flex items-center cursor-pointer"><input type="radio" name="paymentMethod" value="cod" className="form-radio h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500" defaultChecked readOnly/><span className="ml-2 text-sm text-gray-700">Cash on Delivery (COD)</span></label>
                        <label className="flex items-center cursor-not-allowed opacity-50"><input type="radio" name="paymentMethod" value="card" className="form-radio h-4 w-4 text-purple-600 border-gray-300" disabled /><span className="ml-2 text-sm text-gray-500">Card (Coming Soon)</span></label>
                    </div>
                </div>
                {/* Action Buttons */}
                <div className="space-y-3">
                    <button onClick={handlePlaceOrder} disabled={loading || !user || !shippingAddress.fullName?.trim() || !shippingAddress.address?.trim() || !shippingAddress.phone?.trim()} className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                        <span>{loading ? 'Processing...' : 'Place Order'}</span>
                    </button>
                    <button onClick={() => navigate('/cart')} className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                        Back to Cart
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartCheckout;
