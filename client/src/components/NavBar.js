import React, { useState, useEffect } from "react";
import {
  LogOut,
  User,
  ShoppingBag,
  Store,
  CheckCircle,
  Clock,
  Package,
  X,
  MapPin,
  Shield,
  ListOrdered, // ✅ Added Order History icon
  ChevronDown, // Optional: Add dropdown indicator
  Search,
  Loader2 // Added Search icon
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom"; // Added useLocation
import { useAuth } from "../context/authContext"; // ✅ Import useAuth

// -------- Seller Badge --------
const SellerBadge = ({ status }) => {
  if (status === "approved") {
    return (
      <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold mt-1">
        <CheckCircle size={12} />
        Verified Seller
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold mt-1">
        <Clock size={12} />
        Pending Review
      </div>
    );
  }
   // Optional: Add rejected status badge if desired
   if (status === "rejected") {
    return (
      <div className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold mt-1">
        <X size={12} />
        Application Rejected
      </div>
    );
  }
  return null; // Return null if status is 'none' or unrecognized
};

// -------- Apply Seller Form --------
const ApplySellerForm = ({ user, onClose, userLocation, onApplicationSubmit }) => {
  const { updateUser } = useAuth(); // Get updateUser from auth context
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

  const [formData, setFormData] = useState({
    businessName: user.businessInfo?.businessName || "",
    businessType: user.businessInfo?.businessType || "",
    address: user.businessInfo?.address || userLocation || "", // Use detected location as fallback
    phone: user.businessInfo?.phone || "", // Prefill phone if exists
    taxId: user.businessInfo?.taxId || "",
    description: user.businessInfo?.description || "",
  });
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const clearMessage = () => setMessage("");

  const sendOtp = async () => {
    setMessage(""); // Clear previous messages
    if (!/^\d{10}$/.test(formData.phone)) {
      setMessage("❌ Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      // NOTE: This assumes the send/verify OTP endpoints do NOT require auth token
      const res = await fetch(`${API_URL}/api/users/seller/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formData.phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setMessage("✅ OTP sent successfully");
      } else {
        setMessage(`❌ ${data.error || 'Failed to send OTP'}`);
      }
    } catch(err) {
      console.error("Send OTP Error:", err);
      setMessage("❌ Server error while sending OTP");
    } finally {
        setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setMessage("");
    if (!otp || otp.length !== 6) { // Assuming 6-digit OTP
      setMessage("❌ Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/seller/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formData.phone, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpVerified(true);
        setMessage("✅ Phone verified successfully!");
      } else {
        setMessage(`❌ ${data.error || 'Invalid OTP'}`);
      }
    } catch(err) {
      console.error("Verify OTP Error:", err);
      setMessage("❌ Server error while verifying OTP");
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!otpVerified) {
      setMessage("❌ Please verify your phone number before submitting");
      return;
    }
    // Basic validation for other fields
    if (!formData.businessName || !formData.businessType || !formData.address || !formData.description) {
        setMessage("❌ Please fill in all required business details.");
        return;
    }

    setLoading(true);
    try {
      const token = user?.token;
      if (!token) throw new Error("Authentication error. Please log in again.");

      console.log("Submitting Seller Application:", formData); // Log data being sent

      const res = await fetch(`${API_URL}/api/users/seller/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.status === 401) throw new Error("Session expired. Please log in again.");

      const data = await res.json(); // Read response body

      if (res.ok) {
        console.log("Seller Application API Response:", data);
        // Update user state locally immediately and in context
        const updatedUserData = {
          ...user,
          sellerStatus: "pending",
          isSeller: false, // Remains false until approved
          businessInfo: { // Store the submitted info locally
            ...formData,
            appliedAt: new Date(), // Add appliedAt timestamp
          },
        };
         updateUser(updatedUserData); // Update context and localStorage via context function
         setMessage("✅ Application submitted successfully! You will be notified upon review.");
         onApplicationSubmit(); // Call parent callback
         setTimeout(onClose, 2000); // Close modal after delay
      } else {
         console.error("Seller Application Failed:", data);
        setMessage(`❌ Application failed: ${data.error || data.message || 'Unknown server error'}`);
      }
    } catch (err) {
       console.error("Handle Submit Seller Application Error:", err);
      setMessage(`❌ Error submitting application: ${err.message}`);
       if (err.message?.includes("Session expired")) {
           // Optionally trigger logout from context here
       }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800" aria-label="Close form">
            <X size={20} />
        </button>
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Apply as Seller</h3>

        {/* --- Message Display --- */}
        {message && (
            <p className={`mb-4 text-sm text-center font-medium p-2 rounded ${
                message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
                {message}
            </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Business Name"
            value={formData.businessName}
            onChange={(e) => { clearMessage(); setFormData({ ...formData, businessName: e.target.value }); }}
            required
            className="w-full border border-gray-300 p-2 rounded focus:ring-purple-500 focus:border-purple-500 transition duration-150"
          />
          <select
            value={formData.businessType}
            onChange={(e) => { clearMessage(); setFormData({ ...formData, businessType: e.target.value }); }}
            required
            className="w-full border border-gray-300 p-2 rounded bg-white focus:ring-purple-500 focus:border-purple-500 transition duration-150"
          >
            <option value="">Select Business Type</option>
            <option value="individual">Individual / Sole Proprietor</option>
            <option value="small_business">Small Business / Partnership</option>
            <option value="corporation">Corporation / LLC</option>
            <option value="other">Other</option>
          </select>
          <textarea
            placeholder="Full Business Address"
            value={formData.address}
            onChange={(e) => { clearMessage(); setFormData({ ...formData, address: e.target.value }); }}
            required
            rows={3}
            className="w-full border border-gray-300 p-2 rounded focus:ring-purple-500 focus:border-purple-500 transition duration-150"
          />
          {/* Phone Input & OTP */}
          <div className="space-y-2">
              <label htmlFor="seller-phone" className="text-sm font-medium text-gray-700">Phone Number (for verification)</label>
              <div className="flex gap-2">
                <input
                    id="seller-phone"
                    type="tel"
                    placeholder="10-digit mobile"
                    value={formData.phone}
                    onChange={(e) => { clearMessage(); setFormData({ ...formData, phone: e.target.value }); }}
                    required
                    maxLength={10}
                    pattern="\d{10}"
                    title="Enter 10 digits"
                    className={`flex-1 border p-2 rounded transition duration-150 ${otpVerified ? 'bg-green-50 border-green-300' : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'}`}
                    disabled={otpVerified || loading} // Disable if verified or loading
                    aria-describedby="phone-status"
                />
                {!otpVerified && (
                     <button
                        type="button"
                        onClick={sendOtp}
                        disabled={loading || !formData.phone || formData.phone.length !== 10}
                        className={`px-3 py-2 rounded text-sm font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${otpSent ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'} disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {loading && !otpSent ? <Loader2 size={16} className="animate-spin"/> : (otpSent ? "Resend OTP" : "Send OTP")}
                    </button>
                )}
                 {otpVerified && <CheckCircle size={20} className="text-green-600 self-center"/>}
              </div>
              <p id="phone-status" className="text-xs text-gray-500">
                  {otpVerified ? "Phone number verified." : (otpSent ? "Enter the OTP received via SMS." : "We'll send an OTP to verify.")}
              </p>
          </div>
          {/* OTP Input */}
          {otpSent && !otpVerified && (
            <div className="space-y-2">
                <label htmlFor="seller-otp" className="text-sm font-medium text-gray-700">Enter OTP</label>
                <div className="flex gap-2">
                <input
                    id="seller-otp"
                    type="text"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => { clearMessage(); setOtp(e.target.value); }}
                    maxLength={6}
                    className="flex-1 border border-gray-300 p-2 rounded focus:ring-purple-500 focus:border-purple-500 transition duration-150"
                    disabled={loading}
                />
                <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="px-3 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 size={16} className="animate-spin"/> : "Verify OTP"}
                </button>
                </div>
            </div>
          )}
          {/* Tax ID */}
           <div>
                <label htmlFor="seller-taxid" className="text-sm font-medium text-gray-700">Tax ID (e.g., GSTIN, optional)</label>
                <input
                    id="seller-taxid"
                    type="text"
                    placeholder="Enter your business Tax ID if applicable"
                    value={formData.taxId}
                    onChange={(e) => { clearMessage(); setFormData({ ...formData, taxId: e.target.value }); }}
                    className="w-full mt-1 border border-gray-300 p-2 rounded focus:ring-purple-500 focus:border-purple-500 transition duration-150"
                />
            </div>
            {/* Description */}
           <div>
                <label htmlFor="seller-desc" className="text-sm font-medium text-gray-700">Business Description</label>
                <textarea
                    id="seller-desc"
                    placeholder="Briefly describe your business and products"
                    value={formData.description}
                    onChange={(e) => { clearMessage(); setFormData({ ...formData, description: e.target.value }); }}
                    required
                    rows={3}
                    className="w-full mt-1 border border-gray-300 p-2 rounded focus:ring-purple-500 focus:border-purple-500 transition duration-150"
                />
           </div>
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !otpVerified} // Disable until verified
            className="w-full bg-purple-600 text-white py-2.5 rounded font-semibold hover:bg-purple-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={20} className="animate-spin inline-block"/> : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
};


// -------- Navbar Component --------
// Added onLogout prop, removed setUser
export default function Navbar({ searchTerm, setSearchTerm, onLogout, cartCount }) {
  const navigate = useNavigate();
  const location = useLocation(); // Get location for search query persistence
   const { user, updateUser } = useAuth(); // ✅ Get user and updateUser from context

  const [showDropdown, setShowDropdown] = useState(false);
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [userLocation, setUserLocation] = useState(null); // Full address string
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDisplay, setLocationDisplay] = useState("Get Location"); // Text displayed on button

  // Close dropdown if user navigates away or clicks outside (optional improvement)
  useEffect(() => {
      setShowDropdown(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setShowDropdown(false); // Close dropdown on logout
    onLogout(); // Call the logout function from AuthContext passed via prop
    navigate("/"); // Navigate to home after logout
  };

   // Callback for ApplySellerForm to indicate submission
   const handleApplicationSubmitted = () => {
       console.log("Navbar: Seller application submitted flag received.");
       // No need to manually update user state here, ApplySellerForm uses updateUser context function
       setShowSellerForm(false); // Close the form
   };


  // Fetch Geolocation and Reverse Geocode
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationDisplay("Not Supported");
      return;
    }

    setLocationLoading(true);
    setLocationDisplay("Fetching...");
    setUserLocation(null); // Reset full location

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`Location obtained: Lat ${latitude}, Lon ${longitude}`);
        try {
          // Using Nominatim for reverse geocoding (OpenStreetMap data)
          // Make sure to respect their usage policy (no heavy bulk requests)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
          const data = await res.json();
          console.log("Nominatim response:", data);

          if (data && data.address) {
            // Construct a display name (e.g., City, State or Suburb, City)
            const city = data.address.city || data.address.town || data.address.village;
            const state = data.address.state;
            const suburb = data.address.suburb;
            let display = "Location Found";
            if (city && state) display = `${city}, ${state}`;
            else if (suburb && city) display = `${suburb}, ${city}`;
            else if (city) display = city;
            else if (data.display_name) display = data.display_name.split(',').slice(0, 2).join(', '); // Fallback

            setUserLocation(data.display_name); // Store full address if needed later
            setLocationDisplay(display);
            console.log("Location set:", display);
          } else {
             console.warn("Could not parse location from Nominatim response.");
            setLocationDisplay("Address N/A");
          }
        } catch (error) {
           console.error("Error reverse geocoding:", error);
          setLocationDisplay("Error Finding Address");
        } finally {
             setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Error getting geolocation:", error);
        // Handle common errors
        let errMsg = "Error Getting Location";
        if (error.code === error.PERMISSION_DENIED) errMsg = "Location Denied";
        else if (error.code === error.POSITION_UNAVAILABLE) errMsg = "Location Unavailable";
        else if (error.code === error.TIMEOUT) errMsg = "Location Timeout";
        setLocationDisplay(errMsg);
        setLocationLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: false } // Options: 10s timeout, lower accuracy is often faster
    );
  };

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
        // Use navigate to go to search results page with query parameter
        navigate(`/search?query=${encodeURIComponent(trimmedSearch)}`);
    } else {
        // Optional: navigate to home or clear results if search is empty
        // navigate('/'); // Or maybe clear search results if on search page
    }
  };

  return (
    <>
      <nav className="fixed w-full top-0 bg-white shadow-md z-40"> {/* Reduced shadow */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Seller Status */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold text-purple-700 hover:text-purple-800 transition-colors">
                Spectra
              </Link>
               {/* Display Seller Badge next to logo if applicable */}
               {user && user.sellerStatus !== 'none' && (
                  <div className="ml-2 hidden sm:block">
                     <SellerBadge status={user.sellerStatus} />
                  </div>
               )}
            </div>

            {/* Search Bar (Centered) */}
            <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end">
              <div className="max-w-lg w-full lg:max-w-xs">
                <form className="relative text-gray-400 focus-within:text-gray-600" onSubmit={handleSearch}>
                   <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Search size={18} />
                   </span>
                  <input
                    id="search"
                    name="search"
                    type="search"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out"
                  />
                   {/* Hidden submit button for accessibility/enter key */}
                   <button type="submit" className="sr-only">Search</button>
                </form>
              </div>
            </div>


            {/* Right Side Icons & User Menu */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Location Button (Optional) */}
               {/* <button
                    onClick={handleGetLocation}
                    disabled={locationLoading}
                    className="hidden md:flex items-center gap-1 text-sm text-gray-600 hover:text-purple-700 p-2 rounded-md transition-colors"
                    title={userLocation || locationDisplay} // Show full address on hover
                >
                    <MapPin size={16} />
                    <span className="max-w-[100px] truncate">{locationDisplay}</span>
                    {locationLoading && <Loader2 size={16} className="animate-spin ml-1"/>}
                </button> */}

              {/* Cart Icon */}
              <Link to="/cart" className="relative p-2 text-gray-600 hover:text-purple-700 transition-colors rounded-full hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:ring-2 focus:ring-offset-1 focus:ring-purple-500" aria-label={`View Cart, ${cartCount} items`}>
                <ShoppingBag size={22} />
                {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-xs bg-red-600 text-white rounded-full px-1.5 py-0.5 font-bold animate-pulse">
                        {cartCount}
                    </span>
                 )}
              </Link>

              {/* User Menu / Login Button */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown((prev) => !prev)} // Toggle dropdown
                    className="flex items-center gap-1.5 p-1.5 rounded-full text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:ring-2 focus:ring-offset-1 focus:ring-purple-500"
                     aria-expanded={showDropdown}
                     aria-haspopup="true"
                  >
                     {/* User Avatar Placeholder */}
                     <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-purple-600">
                         <span className="text-sm font-medium leading-none text-white">{user.name?.charAt(0).toUpperCase() || '?'}</span>
                     </span>
                    <span className="hidden sm:inline font-medium truncate max-w-[100px]" title={user.name}>{user.name}</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div
                        className="absolute right-0 mt-2 w-56 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-1"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="user-menu-button"
                    >
                        {/* ✅ UPDATED ORDER HISTORY LINK */}
                         <Link
                            to="/order-history" // Navigate to the dedicated order history page
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center gap-3 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                            role="menuitem"
                            onClick={() => setShowDropdown(false)} // Close dropdown on click
                        >
                            <ListOrdered size={16} /> My Orders
                        </Link>

                         <Link
                            to="/profile" // Link to the profile page (no tab needed now)
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center gap-3 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                            role="menuitem"
                             onClick={() => setShowDropdown(false)}
                        >
                            <User size={16} /> My Profile
                        </Link>

                        {/* Conditional Seller/Admin Links */}
                        {user.isSeller && (
                        <Link
                            to="/seller/dashboard"
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center gap-3 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                             role="menuitem"
                              onClick={() => setShowDropdown(false)}
                        >
                            <Package size={16} /> Seller Dashboard
                        </Link>
                        )}

                        {user.isAdmin && (
                        <Link
                            to="/admin/dashboard"
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center gap-3 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                            role="menuitem"
                             onClick={() => setShowDropdown(false)}
                        >
                            <Shield size={16} /> Admin Dashboard
                        </Link>
                        )}

                        {/* Apply as Seller / Resubmit */}
                        {!user.isSeller && user.sellerStatus !== 'approved' && (
                             <button
                                onClick={() => { setShowSellerForm(true); setShowDropdown(false); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center gap-3 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                role="menuitem"
                             >
                                <Store size={16} />
                                {user.sellerStatus === "pending" || user.sellerStatus === "rejected"
                                ? "Manage Seller Application"
                                : "Apply as Seller"}
                            </button>
                        )}

                        {/* Logout Button */}
                         <div className="border-t border-gray-100 my-1"></div>
                         <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 flex items-center gap-3 hover:bg-red-50 transition-colors"
                             role="menuitem"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                  )}
                </div>
              ) : (
                // Login Button
                <Link
                  to="/login"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Login / Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
         {/* Mobile Search Bar - Optionally add later if needed */}
         {/* <div className="md:hidden p-4 border-t border-gray-100"> ... </div> */}
      </nav>

      {/* Seller Application Modal */}
      {showSellerForm && user && ( // Ensure user exists before showing form
        <ApplySellerForm
          user={user}
           // No setUser needed, form uses context's updateUser
          onClose={() => setShowSellerForm(false)}
          userLocation={userLocation} // Pass detected location
          onApplicationSubmit={handleApplicationSubmitted} // Pass callback
        />
      )}
    </>
  );
}

