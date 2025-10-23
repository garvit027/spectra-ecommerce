    import React, { useEffect, useState } from "react";
    import { useNavigate } from "react-router-dom";
    // ✅ 1. Import useAuth
    import { useAuth } from "../context/authContext";

    // ✅ Base API URL (keep this)
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

    // ✅ 2. Component name should be capitalized
    function ProfilePage() {
      // ✅ 3. Get user, logout, and updateUser from context
      const { user, logout, updateUser, loading: authLoading } = useAuth();

      const [formData, setFormData] = useState({
        name: "",
        email: "",
        contactNo: "",
        age: "",
        address: "", // ✅ 4. Add address to form state
      });
      const [editing, setEditing] = useState(false);
      const [message, setMessage] = useState("");
      const [loading, setLoading] = useState(false);
      const navigate = useNavigate();

      // --- ADDED LOG ---
      console.log("ProfilePage rendering. Editing state:", editing);
      // ---

      // ✅ 5. Populate form ONLY from the live context user when it changes
      useEffect(() => {
        // --- ADDED LOG ---
        console.log("ProfilePage useEffect[user, authLoading] running. User:", user);
        // ---
        if (user) {
          setFormData({
            name: user.name || "",
            email: user.email || "",
            contactNo: user.contactNo || "",
            age: user.age || "",
            address: user.address || "", // ✅ Populate address
          });
        } else if (!authLoading) { // Redirect only if not loading and user is null
           console.log("ProfilePage: No user found after loading, redirecting to login.");
           navigate("/login");
        }
      }, [user, authLoading, navigate]); // Depend on the live user object and loading state


      const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
      };

      const handleSave = async () => {
        // ✅ 6. Add address validation (optional, could just check if empty)
        if (!formData.name || !formData.contactNo || !formData.age || !formData.address) {
          setMessage("Please fill all details, including address.");
          return;
        }
        if (!/^\d{10}$/.test(formData.contactNo)) {
          setMessage("Please enter a valid 10-digit mobile number.");
          return;
        }
         if (isNaN(parseInt(formData.age, 10)) || parseInt(formData.age, 10) <= 0 || parseInt(formData.age, 10) > 120) {
            setMessage("Please enter a valid age.");
            return;
         }

        setLoading(true);
        setMessage("");

        try {
          // ✅ 7. Get the LIVE token from the context user
          const token = user?.token;
          if (!token) {
            setMessage("Authentication error. Please log in again.");
            logout();
            setLoading(false);
            return;
          }

          const res = await fetch(`${API_URL}/api/users/update`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // Use the live token
            },
            body: JSON.stringify({
              name: formData.name,
              contactNo: formData.contactNo,
              age: formData.age,
              address: formData.address, // ✅ 8. Send address in the body
            }),
          });

          // Handle auth error during save
          if (res.status === 401) {
              setMessage("Session expired. Please log in again.");
              logout();
              setLoading(false);
              return;
          }

          const data = await res.json();
          if (res.ok && data.user) { // Check if user data exists in response
            // ✅ 9. Call the context's updateUser function
            updateUser(data.user);
            setEditing(false);
            setMessage("Profile updated successfully ✅");
          } else {
            setMessage(data.error || "Failed to update profile.");
          }
        } catch (err) {
          console.error("handleSave error:", err);
          setMessage("Server error while updating profile.");
           if (err.message?.includes("Unauthorized") || err.message?.includes("401")) {
               setMessage("Session expired. Please log in again.");
               logout();
           }
        } finally {
          setLoading(false);
        }
      };

      const handleEditClick = () => {
        // --- ADDED LOG ---
        console.log("handleEditClick called. Setting editing to true.");
        // ---
        setEditing(true);
        setMessage("");
      };

      const handleCancelClick = () => {
        // --- ADDED LOG ---
        console.log("handleCancelClick called. Setting editing to false.");
        // ---
        setEditing(false);
        // ✅ 10. Reset form using the LIVE context user, including address
        if (user) {
          setFormData({
            name: user.name || "",
            email: user.email || "",
            contactNo: user.contactNo || "",
            age: user.age || "",
            address: user.address || "", // Reset address too
          });
        }
        setMessage("");
      };

       // Handle case where context is still loading
       if (authLoading) {
           return (
                <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
                    <p className="text-lg text-gray-600">Loading profile...</p>
                </div>
           );
       }

      // User object might be available but needs profile completion
      // This page IS the profile completion page, so no redirect needed here typically.
      // The redirect logic is now correctly in the useEffect.

      // The rest of your JSX remains largely the same
      return (
        <div className="max-w-xl mx-auto mt-20 sm:mt-24 mb-10 bg-white shadow-xl rounded-2xl p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-purple-700 mb-6 text-center">My Profile</h2>

          <div className="grid gap-5">
            {/* Name */}
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                id="profile-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!editing} // This is the key prop
                className={`border p-2.5 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-150 ${!editing ? "bg-gray-100 cursor-not-allowed" : "border-gray-300"}`}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="profile-email"
                type="email"
                value={formData.email}
                disabled // Email usually not editable
                className="border p-2.5 w-full rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Mobile */}
            <div>
              <label htmlFor="profile-contactNo" className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                 id="profile-contactNo"
                name="contactNo"
                type="tel"
                value={formData.contactNo}
                onChange={handleChange}
                disabled={!editing} // This is the key prop
                maxLength={10}
                pattern="\d{10}"
                title="Please enter a 10-digit mobile number"
                className={`border p-2.5 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-150 ${!editing ? "bg-gray-100 cursor-not-allowed" : "border-gray-300"}`}
                required
              />
            </div>

            {/* Age */}
            <div>
              <label htmlFor="profile-age" className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                id="profile-age"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                disabled={!editing} // This is the key prop
                 min="1"
                 max="120"
                className={`border p-2.5 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-150 ${!editing ? "bg-gray-100 cursor-not-allowed" : "border-gray-300"}`}
                required
              />
            </div>

            {/* ✅ 11. Add Address Field */}
            <div>
              <label htmlFor="profile-address" className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
              <textarea
                id="profile-address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={!editing} // This is the key prop
                rows={3}
                className={`border p-2.5 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-150 ${!editing ? "bg-gray-100 cursor-not-allowed" : "border-gray-300"}`}
                placeholder="Enter your full shipping address"
                required
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleCancelClick}
                  className="w-full sm:w-auto bg-gray-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleEditClick} // Button calls the handler
                className="w-full sm:w-auto bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Edit Profile
              </button>
            )}
             {/* Logout Button */}
             <button
                onClick={() => { logout(); navigate('/login'); }} // Ensure redirect after logout
                className="w-full sm:w-auto sm:ml-auto bg-red-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
          </div>

          {/* Status Messages */}
          {message && (
            <p
              className={`mt-5 text-center text-sm font-medium ${
                message.includes("success") ? "text-green-600" : "text-red-600"
              }`}
              role="alert"
            >
              {message}
            </p>
          )}

        </div>
      );
    }

    // ✅ Export with correct name
    export default ProfilePage;
    

