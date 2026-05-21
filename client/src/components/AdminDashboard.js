// src/components/AdminDashboard.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/authContext";
import { toast } from "react-hot-toast";
import { LayoutGrid, ClipboardList, Check, X, Shield, Package, User, Phone, MapPin, AlertCircle } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("products"); // products | applications
  const [products, setProducts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    images: "",
    specifications: "",
  });
  const [loading, setLoading] = useState(false);
  const [appsLoading, setAppsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({}); // { [userId]: reasonText }
  const [showRejectInput, setShowRejectInput] = useState({}); // { [userId]: boolean }

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      let res;
      if (user?.isAdmin) {
        // Fetch using the correct list endpoint alias
        res = await axios.get(`${API_URL}/api/products/all/list`, config);
      } else if (user?.isSeller) {
        res = await axios.get(`${API_URL}/api/products/seller/${user._id || user.id}`, config);
      }
      setProducts(res?.data || []);
    } catch (err) {
      console.error("fetchProducts error:", err);
      toast.error("Failed to fetch products.");
    }
    setLoading(false);
  }, [user, token]);

  const fetchApplications = useCallback(async () => {
    if (!user?.isAdmin) return;
    setAppsLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/api/admin/seller-applications`, config);
      setApplications(res?.data || []);
    } catch (err) {
      console.error("fetchApplications error:", err);
      toast.error("Failed to load seller applications.");
    }
    setAppsLoading(false);
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      fetchProducts();
      if (user.isAdmin) {
        fetchApplications();
      }
    }
  }, [user, token, fetchProducts, fetchApplications]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
      images: Array.isArray(product.images) ? product.images.join(", ") : "",
      specifications: JSON.stringify(product.specifications || {}, null, 2),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        ...formData,
        images: formData.images.split(",").map((i) => i.trim()).filter(Boolean),
        specifications: JSON.parse(formData.specifications || "{}"),
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/api/products/${editingProduct._id}`, payload, config);
        toast.success("✅ Product updated");
      } else {
        await axios.post(`${API_URL}/api/products`, payload, config);
        toast.success("✅ Product added");
      }
      setFormData({ name: "", description: "", price: "", category: "", stock: "", images: "", specifications: "" });
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error("❌ Error saving product");
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Delete this product?")) {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.delete(`${API_URL}/api/products/${id}`, config);
        setProducts(products.filter((p) => p._id !== id));
        toast.success("🗑️ Product deleted");
      } catch {
        toast.error("❌ Error deleting product");
      }
    }
  };

  const handleApproveSeller = async (userId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/admin/verify-seller-direct/${userId}`, {}, config);
      toast.success("Seller approved successfully! 🎉");
      fetchApplications();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve seller.");
    }
  };

  const handleRejectSeller = async (userId) => {
    const reason = rejectionReasons[userId] || "";
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/admin/reject-seller-direct/${userId}`, { reason }, config);
      toast.success("Seller application rejected.");
      // Clear input state
      setRejectionReasons(prev => ({ ...prev, [userId]: "" }));
      setShowRejectInput(prev => ({ ...prev, [userId]: false }));
      fetchApplications();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject seller.");
    }
  };

  return (
    <div className="bg-gray-150 min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header section */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-8 text-white">
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <Shield size={32} />
            {user?.isAdmin ? "Admin Control Panel" : "Seller Operations Hub"}
          </h1>
          <p className="text-purple-100 mt-2 text-sm">
            {user?.isAdmin
              ? "Manage platform catalog products and review onboarding seller requests."
              : "Create, view, and update your product catalog listings."}
          </p>
        </div>

        {/* Tab System for Admin */}
        {user?.isAdmin && (
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "products"
                  ? "border-purple-600 text-purple-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid size={16} />
              Manage Products
            </button>
            <button
              onClick={() => setActiveTab("applications")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all relative ${
                activeTab === "applications"
                  ? "border-purple-600 text-purple-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ClipboardList size={16} />
              Seller Applications
              {applications.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                  {applications.length}
                </span>
              )}
            </button>
          </div>
        )}

        <div className="p-6 sm:p-8">
          {activeTab === "products" ? (
            <div className="space-y-8">
              {/* Product Form */}
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Package className="text-purple-600" size={20} />
                  {editingProduct ? "Update Catalog Item" : "Add Product Listing"}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Product Title"
                    required
                    className="w-full border-gray-200 rounded-xl p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                  />
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Product Description"
                    required
                    rows={3}
                    className="w-full border-gray-200 rounded-xl p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="Price ($)"
                      required
                      min="0"
                      className="w-full border-gray-200 rounded-xl p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                    />
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleChange}
                      placeholder="Stock Inventory"
                      required
                      min="0"
                      className="w-full border-gray-200 rounded-xl p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <input
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Category"
                    className="w-full border-gray-200 rounded-xl p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                  />
                  <input
                    name="images"
                    value={formData.images}
                    onChange={handleChange}
                    placeholder="Image URLs (comma separated)"
                    className="w-full border-gray-200 rounded-xl p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                  />
                  <textarea
                    name="specifications"
                    value={formData.specifications}
                    onChange={handleChange}
                    rows="3"
                    placeholder={`Specifications (JSON format: { "Color": "Black", "Weight": "1kg" })`}
                    className="w-full border-gray-200 rounded-xl font-mono text-xs p-2.5 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50 text-sm"
                    >
                      {loading ? "Processing..." : editingProduct ? "Update Product" : "Publish Product"}
                    </button>
                    {editingProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setFormData({ name: "", description: "", price: "", category: "", stock: "", images: "", specifications: "" });
                        }}
                        className="px-6 py-3 border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Product Listing */}
              <div className="bg-white rounded-2xl">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <LayoutGrid size={20} className="text-purple-600" />
                  Product Inventory Catalog
                </h2>
                {loading ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  </div>
                ) : products.length > 0 ? (
                  <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <ul className="divide-y divide-gray-100">
                      {products.map((p) => (
                        <li key={p._id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-gray-50/50 transition">
                          <div>
                            <h3 className="font-bold text-gray-900 text-base">{p.name}</h3>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span>Price: <strong className="text-gray-800">${p.price}</strong></span>
                              <span>Stock: <strong className="text-gray-800">{p.stock}</strong></span>
                              <span>Category: <strong className="text-gray-800">{p.category}</strong></span>
                            </div>
                            {p.stock <= 0 && (
                              <span className="inline-block mt-2 px-2 py-0.5 bg-red-50 text-red-600 text-2xs font-extrabold uppercase tracking-wider rounded border border-red-100">
                                Out of Stock
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:self-center">
                            <button
                              onClick={() => handleEditClick(p)}
                              className="px-3.5 py-1.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 rounded-lg hover:bg-purple-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p._id)}
                              className="px-3.5 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                    <p className="text-gray-400 text-sm">No products found in this section yet.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Seller Applications Tab (Admins Only) */
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <ClipboardList size={20} className="text-purple-600" />
                Pending Seller Applications
              </h2>

              {appsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              ) : applications.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {applications.map((app) => (
                    <div
                      key={app.userId}
                      className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden"
                    >
                      <div className="p-6">
                        {/* Summary Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 mb-4 gap-2">
                          <div>
                            <h3 className="font-extrabold text-gray-900 text-lg">
                              {app.businessName}
                            </h3>
                            <span className="inline-block mt-1 px-2.5 py-0.5 bg-purple-50 border border-purple-100 text-purple-700 text-2xs font-bold uppercase rounded-full">
                              {app.businessType}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Applied: {new Date(app.appliedAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Info details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <User size={14} className="text-gray-400" />
                              <span>Applicant: <strong>{app.name}</strong> ({app.email})</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone size={14} className="text-gray-400" />
                              <span>Phone: <strong>{app.phone}</strong></span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <MapPin size={14} className="text-gray-400" />
                              <span>Address: <strong>{app.address}</strong></span>
                            </div>
                            {app.taxId && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <ClipboardList size={14} className="text-gray-400" />
                                <span>Tax ID: <strong>{app.taxId}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Description block */}
                        <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 mb-6">
                          <h4 className="text-2xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                            Business Description
                          </h4>
                          <p className="text-xs text-gray-600 italic">
                            "{app.description}"
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-3">
                          {!showRejectInput[app.userId] ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleApproveSeller(app.userId)}
                                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm hover:shadow-green-100 transition-all gap-1.5"
                              >
                                <Check size={14} />
                                Approve Application
                              </button>
                              <button
                                onClick={() => setShowRejectInput(prev => ({ ...prev, [app.userId]: true }))}
                                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold border border-red-100 hover:bg-red-50 text-red-600 rounded-xl transition"
                              >
                                <X size={14} />
                                Reject Application
                              </button>
                            </div>
                          ) : (
                            <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl space-y-3">
                              <label className="block text-xs font-bold text-red-700">
                                Rejection Reason / Feedback *
                              </label>
                              <input
                                type="text"
                                placeholder="State why this application is being rejected (e.g. Invalid tax ID, incomplete address)"
                                value={rejectionReasons[app.userId] || ""}
                                onChange={(e) =>
                                  setRejectionReasons((prev) => ({
                                    ...prev,
                                    [app.userId]: e.target.value,
                                  }))
                                }
                                className="w-full border-red-200 focus:ring-red-500 focus:border-red-500 rounded-lg text-xs p-2 bg-white"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleRejectSeller(app.userId)}
                                  className="px-3.5 py-1.5 text-2xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow"
                                >
                                  Submit Rejection
                                </button>
                                <button
                                  onClick={() => setShowRejectInput(prev => ({ ...prev, [app.userId]: false }))}
                                  className="px-3.5 py-1.5 text-2xs font-bold border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg bg-white"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed border-gray-150 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center p-6">
                  <AlertCircle size={40} className="text-gray-300 mb-2" />
                  <p className="text-gray-400 font-semibold text-sm">No Pending Seller Applications</p>
                  <p className="text-gray-400 text-xs mt-1">All applications have been successfully processed! ✨</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;