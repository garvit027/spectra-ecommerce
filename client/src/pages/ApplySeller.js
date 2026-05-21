import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { Briefcase, Building, MapPin, Phone, FileText, ChevronRight, Store } from "lucide-react";
import { toast } from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function ApplySeller() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    address: "",
    phone: "",
    taxId: "",
    description: "",
  });

  // Pre-fill form from user profile if data is available
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        phone: user.contactNo || prev.phone || "",
        address: user.address || prev.address || "",
        businessName: user.businessInfo?.businessName || "",
        businessType: user.businessInfo?.businessType || "",
        taxId: user.businessInfo?.taxId || "",
        description: user.businessInfo?.description || "",
      }));
    }
  }, [user]);

  // Redirect if already a seller or pending
  useEffect(() => {
    if (user?.isSeller) {
      navigate("/seller/dashboard", { replace: true });
    } else if (user?.sellerStatus === "pending") {
      navigate("/seller-application-status", { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.token) {
      toast.error("You must be logged in to apply.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/apply-seller`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Application submitted successfully!");
        updateUser(data.user);
        navigate("/seller-application-status", { replace: true });
      } else {
        toast.error(data.error || "Failed to submit application.");
      }
    } catch (err) {
      console.error("Error submitting seller application:", err);
      toast.error("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Back drop / Header Card */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
          <Store size={240} />
        </div>
        <div className="relative z-10 max-w-lg">
          <span className="bg-purple-500/30 text-purple-200 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-purple-500/20">
            Spectra Partners
          </span>
          <h1 className="text-3xl font-extrabold mt-4 mb-2 tracking-tight">
            Start Selling on Spectra
          </h1>
          <p className="text-purple-100/90 text-sm leading-relaxed">
            Reach thousands of customers and scale your business with our state-of-the-art commerce infrastructure. Fill in your details below to apply.
          </p>
        </div>
      </div>

      {/* Main Registration Form */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Briefcase className="text-purple-600" size={22} />
            Business Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business / Store Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Building size={18} />
                  </div>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Acme Retailers"
                    className="pl-10 w-full rounded-xl border-gray-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm py-2.5"
                  />
                </div>
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Entity Type *
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border-gray-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm py-2.5"
                >
                  <option value="">Select entity type</option>
                  <option value="Individual">Individual / Sole Proprietor</option>
                  <option value="Small Business">Small Business</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Corporation">Corporation</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="e.g. +1 (555) 000-0000"
                    className="pl-10 w-full rounded-xl border-gray-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm py-2.5"
                  />
                </div>
              </div>

              {/* Tax ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tax ID / GSTIN (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FileText size={18} />
                  </div>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder="e.g. GSTIN12345ABC"
                    className="pl-10 w-full rounded-xl border-gray-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm py-2.5"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Business Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <MapPin size={18} />
                </div>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 123 Main St, New York, NY 10001"
                  className="pl-10 w-full rounded-xl border-gray-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm py-2.5"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Business Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Briefly describe what you plan to sell and details about your business operations..."
                className="w-full rounded-xl border-gray-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm py-2.5"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-purple-200 transition-all flex items-center gap-2 disabled:opacity-50 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {loading ? "Submitting..." : "Submit Application"}
                <ChevronRight size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}