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
const SellerBadge = () => (
  <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-200 shadow-sm animate-pulse">
    <Shield size={10} className="fill-current" />
    <span>VERIFIED SELLER</span>
  </div>
);



// -------- Apply Seller Form --------
// Removed ApplySellerForm component


// -------- Navbar Component --------
// Added onLogout prop, removed setUser
export default function Navbar({ searchTerm, setSearchTerm, onLogout, cartCount }) {
  const navigate = useNavigate();
  const location = useLocation(); // Get location for search query persistence
   const { user, updateUser } = useAuth(); // ✅ Get user and updateUser from context

  const [showDropdown, setShowDropdown] = useState(false);
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

   // Seller Application code removed


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
               <button
                    onClick={handleGetLocation}
                    disabled={locationLoading}
                    className="hidden md:flex items-center gap-1 text-sm text-gray-600 hover:text-purple-700 p-2 rounded-md transition-colors"
                    title={userLocation || locationDisplay} // Show full address on hover
                >
                    <MapPin size={16} />
                    <span className="max-w-[100px] truncate">{locationDisplay}</span>
                    {locationLoading && <Loader2 size={16} className="animate-spin ml-1"/>}
                </button>

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
                    {user.isSeller && <SellerBadge />}
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
                        {user.isSeller ? (
                          <Link
                              to="/seller/dashboard"
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center gap-3 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                               role="menuitem"
                                onClick={() => setShowDropdown(false)}
                          >
                              <Package size={16} /> Seller Dashboard
                          </Link>
                        ) : user.sellerStatus === "pending" ? (
                          <Link
                              to="/seller-application-status"
                              className="w-full text-left px-4 py-2 text-sm text-amber-600 flex items-center gap-3 hover:bg-amber-50 transition-colors font-medium animate-pulse"
                               role="menuitem"
                                onClick={() => setShowDropdown(false)}
                          >
                              <Package size={16} /> Application Pending ⏳
                          </Link>
                        ) : (
                          <Link
                              to="/apply-seller"
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center gap-3 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                               role="menuitem"
                                onClick={() => setShowDropdown(false)}
                          >
                              <Package size={16} /> Apply as Seller
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

    </>
  );
}

