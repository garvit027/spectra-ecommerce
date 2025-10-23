// src/pages/SellerDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Bell, Settings, Plus, Edit3, Trash2, ShoppingBag, Package, Users,
  Star, Eye, PauseCircle, PlayCircle, Clock, Shield, LineChart, Rocket,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const ENDPOINTS = {
  dashboard: (range = "7d") => `${API_URL}/api/seller/dashboard?range=${range}`,
  orders: `${API_URL}/api/seller/orders`,
  orderStatus: (id) => `${API_URL}/api/seller/orders/${id}/status`,
  myProducts: `${API_URL}/api/seller/products`,
  availability: `${API_URL}/api/seller/availability`,
  aiInsights: `${API_URL}/api/seller/ai/insights`,
  promotions: `${API_URL}/api/seller/promotions`,
  promotionId: (id) => `${API_URL}/api/seller/promotions/${id}`,
  deleteProduct: (id) => `${API_URL}/api/seller/products/${id}`,
  updateProduct: (id) => `${API_URL}/api/seller/products/${id}`,
  createProduct: `${API_URL}/api/seller/products`,               // POST (same as myProducts)
};

export default function SellerDashboard() {
  const [user, ] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  });

  const authHeader = useMemo(() => {
    const t = user?.token;
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  // filters & loading
  const [range, setRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState(null);

  // core data
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [availability, setAvailability] = useState({ // server shape: { mode, date(s), paused, extendDays }
    paused: false,              // manual pause (portal off)
    mode: "normal",             // "normal" | "holiday" | "vacation"
    holidayDate: null,          // ISO date (for 1-day holiday)
    vacationFrom: null,         // ISO date
    vacationTo: null,           // ISO date
    handling: "extend",         // "extend" | "pause" – how to handle selling during holiday/vacation
    extendDays: 2,              // if handling === "extend", extend delivery by N days
  });

  // AI insights
  const [aiLoading, setAiLoading] = useState(true);
  const [ai, setAi] = useState({
    trending: [],               // {productId, name, reason, score}
    reviewAnalysis: [],         // {productId, name, packagingIssues, shippingIssues, qualityIssues, suggestions: []}
    demandForecast: [],         // {productId, name, demandIndex, stockRisk: "overstock"|"stockout"|"ok", recommendedStock}
  });

  // promotions
  const [promoLoading, setPromoLoading] = useState(true);
  const [promotions, setPromotions] = useState([]);  // { _id, productId, name, budget, reach, sales, status }
  const [newPromo, setNewPromo] = useState({ productId: "", budget: 1000, durationDays: 7 });

  // UI state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmCfg, setConfirmCfg] = useState({ title: "", body: "", onConfirm: null });

  const [expandedAI, setExpandedAI] = useState({ trending: true, reviews: true, forecast: true });
  const [rangeBusy, setRangeBusy] = useState(false);

  // helpers
  const askConfirm = (title, body, onConfirm) => {
    setConfirmCfg({ title, body, onConfirm });
    setShowConfirm(true);
  };

  // ---------- Add/Edit Product Modal state (NEW) ----------
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // full product or null
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    category: "",
    images: [""],  // multiple URLs
  });

  // load dashboard
  useEffect(() => {
    if (!user?.token) { setError("Not authenticated"); setLoading(false); return; }

    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(ENDPOINTS.dashboard(range), { headers: authHeader });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load dashboard");
        if (!mounted) return;
        setDashboard(data);
      } catch (e) {
        console.error(e);
        if (mounted) setError(e.message || "Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user, range, authHeader]);

  // load orders
  useEffect(() => {
    if (!user?.token) return;
    let mounted = true;

    async function loadOrders() {
      setOrdersLoading(true);
      try {
        const res = await fetch(ENDPOINTS.orders, { headers: authHeader });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load orders");
        if (mounted) setOrders(Array.isArray(data) ? data : data.orders || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setOrdersLoading(false);
      }
    }
    loadOrders();
    return () => { mounted = false; };
  }, [user, authHeader]);

  // load own products
  useEffect(() => {
    if (!user?.token) return;
    let mounted = true;

    async function loadMyProducts() {
      try {
        const res = await fetch(ENDPOINTS.myProducts, { headers: authHeader });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load products");
        if (mounted) setProducts(Array.isArray(data) ? data : data.products || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadMyProducts();
    return () => { mounted = false; };
  }, [user, authHeader]);

  // load availability
  useEffect(() => {
    if (!user?.token) return;
    let mounted = true;
    async function loadAvail() {
      try {
        const res = await fetch(ENDPOINTS.availability, { headers: authHeader });
        const data = await res.json();
        if (res.ok && mounted) setAvailability(prev => ({ ...prev, ...data }));
      } catch (e) {
        // ignore
      }
    }
    loadAvail();
  }, [user, authHeader]);

  // load AI insights
  useEffect(() => {
    if (!user?.token) return;
    let mounted = true;
    async function loadAI() {
      setAiLoading(true);
      try {
        const res = await fetch(ENDPOINTS.aiInsights, { headers: authHeader });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load AI insights");
        if (mounted) setAi({
          trending: data.trending || [],
          reviewAnalysis: data.reviewAnalysis || [],
          demandForecast: data.demandForecast || [],
        });
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setAiLoading(false);
      }
    }
    loadAI();
    return () => { mounted = false; };
  }, [user, authHeader]);

  // load promotions
  useEffect(() => {
    if (!user?.token) return;
    let mounted = true;
    async function loadPromos() {
      setPromoLoading(true);
      try {
        const res = await fetch(ENDPOINTS.promotions, { headers: authHeader });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load promotions");
        if (mounted) setPromotions(Array.isArray(data) ? data : data.promotions || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setPromoLoading(false);
      }
    }
    loadPromos();
    return () => { mounted = false; };
  }, [user, authHeader]);

  // derive
  const stats = dashboard?.dashboardStats ?? {
    revenue: { current: 0 },
    orders: { current: 0 },
    products: { current: products.length },
    customers: { current: 0 },
    rating: { current: avg(products.map(p => p.rating || 0)) },
    views: { current: 0 },
  };
  const salesData = dashboard?.salesData ?? [];
  // const topProducts = dashboard?.topProducts?.length ? dashboard.topProducts :
  //   products.slice(0, 4).map(p => ({ id: p._id, name: p.name, stock: p.stock, rating: p.rating || 0, image: p.images?.[0], sales: 0, revenue: 0 }));

  // handlers
  function refreshRange(r) {
    setRangeBusy(true);
    setRange(r);
    // give a tiny delay to show responsiveness
    setTimeout(() => setRangeBusy(false), 350);
  }

  async function updateOrderStatus(orderId, status) {
    askConfirm("Update order status", `Change the order status to “${status}”?`, async () => {
      try {
        const res = await fetch(ENDPOINTS.orderStatus(orderId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to update status");

        setOrders(prev => prev.map(o => (String(o._id || o.id) === String(orderId) || String(o.id)?.endsWith(String(orderId).slice(-6)))
          ? { ...o, status }
          : o
        ));
      } catch (e) {
        alert(e.message || "Failed to update status");
      }
    });
  }

  async function deleteProduct(productId) {
    askConfirm("Delete product", "This will permanently remove the product. Continue?", async () => {
      try {
        const res = await fetch(ENDPOINTS.deleteProduct(productId), { method: "DELETE", headers: authHeader });
        if (!res.ok) throw new Error("Delete failed");
        setProducts(prev => prev.filter(p => String(p._id || p.id) !== String(productId)));
      } catch (e) {
        alert(e.message || "Failed to delete product");
      }
    });
  }

  async function saveAvailability() {
    try {
      const res = await fetch(ENDPOINTS.availability, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(availability),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save availability");
      setAvailability(data);
      alert("Availability updated");
    } catch (e) {
      alert(e.message || "Failed to save availability");
    }
  }

  async function createPromotion() {
    try {
      const res = await fetch(ENDPOINTS.promotions, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(newPromo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create promotion");
      setPromotions(p => [data, ...p]);
      setNewPromo({ productId: "", budget: 1000, durationDays: 7 });
    } catch (e) {
      alert(e.message || "Failed to create promotion");
    }
  }

  async function togglePromotion(id, nextStatus) {
    try {
      const res = await fetch(ENDPOINTS.promotionId(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update promotion");
      setPromotions(prev => prev.map(pr => pr._id === id ? { ...pr, ...data } : pr));
    } catch (e) {
      alert(e.message || "Failed to update promotion");
    }
  }

  // ---------- Add/Edit product actions (NEW) ----------
  function openAddModal() {
    setEditingProduct(null);
    setProductForm({
      name: "",
      description: "",
      price: 0,
      stock: 0,
      category: "",
      images: [""],
    });
    setShowProductModal(true);
  }

  function openEditModal(p) {
    setEditingProduct(p);
    setProductForm({
      name: p.name || "",
      description: p.description || "",
      price: Number(p.price || 0),
      stock: Number(p.stock ?? p.stockCount ?? 0),
      category: p.category || "",
      images: Array.isArray(p.images) && p.images.length ? p.images : [p.images?.[0] || ""],
    });
    setShowProductModal(true);
  }

  function closeProductModal() {
    setShowProductModal(false);
    setEditingProduct(null);
  }

  function updateFormField(field, value) {
    setProductForm(prev => ({ ...prev, [field]: value }));
  }

  function updateImageAt(index, value) {
    setProductForm(prev => {
      const next = [...prev.images];
      next[index] = value;
      return { ...prev, images: next };
    });
  }

  function addImageField() {
    setProductForm(prev => ({ ...prev, images: [...(prev.images || []), ""] }));
  }

  function removeImageField(index) {
    setProductForm(prev => {
      const next = [...(prev.images || [])];
      next.splice(index, 1);
      if (next.length === 0) next.push("");
      return { ...prev, images: next };
    });
  }

  async function submitProductForm() {
    // sanitize
    const payload = {
      ...productForm,
      price: Number(productForm.price) || 0,
      stock: Number(productForm.stock) || 0,
      images: (productForm.images || [])
        .map((u) => String(u || "").trim())
        .filter((u, i, arr) => u && arr.indexOf(u) === i),
    };

    try {
      if (editingProduct?._id || editingProduct?.id) {
        // UPDATE
        const id = editingProduct._id || editingProduct.id;
        const res = await fetch(ENDPOINTS.updateProduct(id), {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to update product");
        setProducts((prev) => prev.map((p) => (String(p._id || p.id) === String(id) ? data : p)));
        alert("Product updated!");
      } else {
        // CREATE
        const res = await fetch(ENDPOINTS.createProduct, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to add product");
        setProducts((prev) => [data, ...prev]);
        alert("Product added!");
      }
      closeProductModal();
    } catch (e) {
      alert(e.message || "Something went wrong");
    }
  }

  if (!user) return <div className="p-8 text-center">Please log in as a seller.</div>;
  if (loading) return <div className="p-8 text-center">Loading dashboard…</div>;
  if (error) return <div className="p-8 text-center text-red-600">❌ {error}</div>;

  const portalOff = availability.paused || availability.handling === "pause";
  const visibleProducts = portalOff ? [] : products;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-purple-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-600">Everything you need to run your store</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={range}
              onChange={(e) => refreshRange(e.target.value)}
              className="border rounded px-3 py-2 bg-white"
              disabled={rangeBusy}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button className="p-2 bg-white rounded shadow"><Bell size={18} /></button>
            <button className="p-2 bg-white rounded shadow"><Settings size={18} /></button>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Stat title="Revenue" value={`₹${(stats.revenue.current || 0).toLocaleString()}`} icon={LineChart} />
          <Stat title="Orders" value={stats.orders.current ?? 0} icon={ShoppingBag} />
          <Stat title="Products Live" value={visibleProducts.length} icon={Package} />
          <Stat title="Customers" value={stats.customers.current ?? 0} icon={Users} />
          <Stat title="Avg Rating" value={Number(stats.rating.current ?? stats.rating ?? 0).toFixed(1)} icon={Star} />
          <Stat title="Views" value={stats.views.current ?? 0} icon={Eye} />
        </div>

        {/* top row: sales + availability */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* sales chart (simple bars) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={18} /> Sales Overview
            </h3>
            <div className="h-48 flex items-end gap-2">
              {(salesData.length ? salesData : Array.from({ length: 7 }).map((_, i) => ({ name: `D${i + 1}`, sales: Math.random() * 3000 })))
                .map((d, i) => (
                  <div key={i} className="flex-1 flex items-end">
                    <div
                      className="w-full bg-purple-600 rounded-t"
                      style={{ height: `${Math.max(6, (d.sales || 0) / 20)}px` }}
                      title={`${d.name}: ₹${Math.round(d.sales || 0)}`}
                    />
                  </div>
                ))}
            </div>
          </div>

          {/* availability & vacation */}
          <div className="bg-white rounded-2xl p-6 shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield size={18} /> Availability & Vacation
              </h3>
              <span className={`px-2 py-1 rounded text-xs ${portalOff ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                {portalOff ? "Portal Off" : "Portal On"}
              </span>
            </div>


            {/* mode picker */}
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Mode</div>
              <div className="grid grid-cols-3 gap-2">
                {["normal", "holiday", "vacation"].map(m => (
                  <button
                    key={m}
                    onClick={() => setAvailability(a => ({ ...a, mode: m }))}
                    className={`px-3 py-2 rounded border ${availability.mode === m ? "bg-purple-600 text-white border-purple-600" : "bg-white"}`}
                  >
                    {m[0].toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* date controls */}
            {availability.mode === "holiday" && (
              <div className="mt-3">
                <label className="text-sm block mb-1">Holiday date (1 day)</label>
                <input
                  type="date"
                  className="border rounded px-3 py-2 w-full"
                  value={availability.holidayDate || ""}
                  onChange={(e) => setAvailability(a => ({ ...a, holidayDate: e.target.value }))}
                />
              </div>
            )}

            {availability.mode === "vacation" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm block mb-1">From</label>
                  <input
                    type="date"
                    className="border rounded px-3 py-2 w-full"
                    value={availability.vacationFrom || ""}
                    onChange={(e) => setAvailability(a => ({ ...a, vacationFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm block mb-1">To</label>
                  <input
                    type="date"
                    className="border rounded px-3 py-2 w-full"
                    value={availability.vacationTo || ""}
                    onChange={(e) => setAvailability(a => ({ ...a, vacationTo: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* handling */}
            {(availability.mode === "holiday" || availability.mode === "vacation") && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">How to handle orders during this period?</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="handling"
                      checked={availability.handling === "extend"}
                      onChange={() => setAvailability(a => ({ ...a, handling: "extend" }))}
                    />
                    <span className="text-sm flex items-center gap-2"><Clock size={16} /> Extend delivery time</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="handling"
                      checked={availability.handling === "pause"}
                      onChange={() => setAvailability(a => ({ ...a, handling: "pause" }))}
                    />
                    <span className="text-sm flex items-center gap-2"><PauseCircle size={16} /> Pause selling temporarily</span>
                  </label>
                </div>

                {availability.handling === "extend" && (
                  <div className="mt-3">
                    <label className="text-sm block mb-1">Extend delivery by (days)</label>
                    <input
                      type="number"
                      className="border rounded px-3 py-2 w-full"
                      min={1}
                      max={30}
                      value={availability.extendDays}
                      onChange={(e) => setAvailability(a => ({ ...a, extendDays: Number(e.target.value) || 1 }))}
                    />
                  </div>
                )}
              </div>
            )}

            <button onClick={saveAvailability} className="mt-5 w-full bg-purple-600 text-white py-2 rounded font-medium hover:bg-purple-700">
              Save Availability
            </button>

            {portalOff ? (
              <p className="text-xs text-red-600 mt-2">
                Your storefront is currently hidden and products won’t appear on the marketplace.
              </p>
            ) : (
              <p className="text-xs text-green-700 mt-2">
                Your storefront is live. If “Extend delivery time” is enabled, customers will see delayed delivery ETA.
              </p>
            )}
          </div>
        </div>

        {/* products & promotions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* my products (only seller’s own) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Package size={18} /> My Products</h3>
              <button
                className="px-3 py-1 bg-purple-600 text-white rounded flex items-center gap-1"
                onClick={openAddModal}
              >
                <Plus size={14} /> Add Product
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(visibleProducts || []).map((p) => (
                <div key={p._id || p.id} className="flex gap-3 items-center border rounded p-3">
                  <img
                    src={p.images?.[0] || "https://via.placeholder.com/90"}
                    alt={p.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-sm text-gray-500">
                          Stock: {p.stock ?? p.stockCount ?? 0} • ₹{(p.price || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">Rating: {(p.rating || 0).toFixed(1)} ({p.numReviews || 0})</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button className="p-2 bg-gray-100 rounded" onClick={() => openEditModal(p)}>
                          <Edit3 size={14} />
                        </button>
                        <button className="p-2 bg-red-100 rounded" onClick={() => deleteProduct(p._id || p.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!visibleProducts.length && (
                <div className="text-sm text-gray-500 col-span-full">
                  {portalOff ? "Products are hidden because the portal is paused." : "No products yet."}
                </div>
              )}
            </div>
          </div>

          {/* promotions */}
          <div className="bg-white rounded-2xl p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Rocket size={18} /> Promotions</h3>
            </div>

            <div className="border rounded-lg p-3 mb-4">
              <div className="text-sm font-medium mb-2">Create Promotion</div>
              <div className="grid grid-cols-1 gap-2">
                <select
                  className="border rounded px-3 py-2"
                  value={newPromo.productId}
                  onChange={(e) => setNewPromo(n => ({ ...n, productId: e.target.value }))}
                >
                  <option value="">Select product</option>
                  {products.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
                </select>
                <input
                  type="number"
                  min={100}
                  className="border rounded px-3 py-2"
                  value={newPromo.budget}
                  onChange={(e) => setNewPromo(n => ({ ...n, budget: Number(e.target.value) || 100 }))}
                  placeholder="Budget (₹)"
                />
                <input
                  type="number"
                  min={1}
                  className="border rounded px-3 py-2"
                  value={newPromo.durationDays}
                  onChange={(e) => setNewPromo(n => ({ ...n, durationDays: Number(e.target.value) || 1 }))}
                  placeholder="Duration (days)"
                />
                <button
                  onClick={createPromotion}
                  className="bg-purple-600 text-white py-2 rounded font-medium hover:bg-purple-700"
                >
                  Launch Promotion
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {promoLoading && <div className="text-sm text-gray-500">Loading promotions…</div>}
              {!promoLoading && !promotions.length && <div className="text-sm text-gray-500">No promotions yet.</div>}
              {promotions.map(pr => (
                <div key={pr._id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{pr.name || pr.productName || "Promotion"}</div>
                      <div className="text-xs text-gray-500">Budget: ₹{(pr.budget || 0).toLocaleString()} • Reach: {pr.reach || 0} • Sales: {pr.sales || 0}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${pr.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                        {pr.status || "draft"}
                      </span>
                      {pr.status === "active" ? (
                        <button className="px-2 py-1 border rounded text-sm" onClick={() => togglePromotion(pr._id, "paused")}>Pause</button>
                      ) : (
                        <button className="px-2 py-1 border rounded text-sm" onClick={() => togglePromotion(pr._id, "active")}>Activate</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* trending */}
          <AISection
            title="Trending & High Demand"
            icon={TrendingUp}
            loading={aiLoading}
            expanded={expandedAI.trending}
            onToggle={() => setExpandedAI(e => ({ ...e, trending: !e.trending }))}
          >
            {!ai.trending.length && <div className="text-sm text-gray-500">No trending insights yet.</div>}
            <div className="space-y-3">
              {ai.trending.map((t, i) => (
                <InsightRow
                  key={i}
                  left={<div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.reason || "High CTR & conversion in your category"}</div>
                  </div>}
                  right={<div className="text-sm font-semibold">Score: {Math.round(t.score || 0)}</div>}
                />
              ))}
            </div>
          </AISection>

          {/* review analysis */}
          <AISection
            title="Smart Review Analysis"
            icon={AlertTriangle}
            loading={aiLoading}
            expanded={expandedAI.reviews}
            onToggle={() => setExpandedAI(e => ({ ...e, reviews: !e.reviews }))}
          >
            {!ai.reviewAnalysis.length && <div className="text-sm text-gray-500">No review insights yet.</div>}
            <div className="space-y-3">
              {ai.reviewAnalysis.map((r, i) => (
                <div key={i} className="border rounded p-3">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    Packaging: {pct(r.packagingIssues)} • Shipping: {pct(r.shippingIssues)} • Quality: {pct(r.qualityIssues)}
                  </div>
                  <ul className="list-disc pl-5 text-sm text-gray-700">
                    {(r.suggestions || []).map((s, idx) => <li key={idx}>{s}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </AISection>

          {/* demand forecast */}
          <AISection
            title="Demand & Inventory Forecast"
            icon={LineChart}
            loading={aiLoading}
            expanded={expandedAI.forecast}
            onToggle={() => setExpandedAI(e => ({ ...e, forecast: !e.forecast }))}
          >
            {!ai.demandForecast.length && <div className="text-sm text-gray-500">No forecast yet.</div>}
            <div className="space-y-3">
              {ai.demandForecast.map((f, i) => (
                <InsightRow
                  key={i}
                  left={<div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-gray-500">
                      Demand Index: {Math.round(f.demandIndex || 0)} • Recommended Stock: {f.recommendedStock || 0}
                    </div>
                  </div>}
                  right={
                    <span className={`text-xs px-2 py-1 rounded ${
                      f.stockRisk === "stockout" ? "bg-red-100 text-red-700" :
                      f.stockRisk === "overstock" ? "bg-yellow-100 text-yellow-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {f.stockRisk || "ok"}
                    </span>
                  }
                />
              ))}
            </div>
          </AISection>
        </div>

        {/* orders management */}
        <div className="bg-white rounded-2xl p-6 shadow mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><ShoppingBag size={18} /> Orders</h3>
            <div className="text-sm text-gray-500">{ordersLoading ? "Loading…" : `${orders.length} orders`}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Order</th>
                  <th className="p-2 text-left">Buyer</th>
                  <th className="p-2 text-left">Products</th>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Placed</th>
                  <th className="p-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {(orders || []).map((o) => (
                  <tr key={o._id || o.id} className="border-t">
                    <td className="p-2">{o.id || `#${String(o._id).slice(-6).toUpperCase()}`}</td>
                    <td className="p-2">{o.customer || o.buyer?.name || o.user?.name || "Customer"}</td>
                    <td className="p-2">{o.product || o.items || o.products?.map?.(p => p.product?.name).join(", ")}</td>
                    <td className="p-2">₹{Math.round(o.amount || o.totalPrice || o.total || 0).toLocaleString()}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${statusPill(o.status)}`}>{o.status}</span>
                    </td>
                    <td className="p-2">{o.date || (o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "")}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={o.status}
                          className="border rounded px-2 py-1"
                          onChange={(e) => updateOrderStatus(o._id || o.id, e.target.value)}
                        >
                          <option value="pending">pending</option>
                          <option value="processing">processing</option>
                          <option value="shipped">shipped</option>
                          <option value="delivered">delivered</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                        <button className="text-purple-600 text-sm" onClick={() => alert("Order detail drawer")}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!orders.length && <tr><td className="p-4 text-center text-gray-500" colSpan={7}>No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* confirm dialog */}
      {showConfirm && (
        <ConfirmDialog
          title={confirmCfg.title}
          body={confirmCfg.body}
          onCancel={() => setShowConfirm(false)}
          onConfirm={async () => {
            try { await confirmCfg.onConfirm?.(); } finally { setShowConfirm(false); }
          }}
        />
      )}

      {/* ---------- Product Add/Edit Modal (NEW) ---------- */}
      {showProductModal && (
        <ProductModal
          isOpen={showProductModal}
          onClose={closeProductModal}
          onSubmit={submitProductForm}
          form={productForm}
          setFormField={updateFormField}
          setImageAt={updateImageAt}
          addImageField={addImageField}
          removeImageField={removeImageField}
          isEditing={!!editingProduct}
        />
      )}
    </div>
  );
}

/* -------------------------- small UI components -------------------------- */

function Stat({ title, value, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{title}</div>
        <Icon size={18} className="text-purple-600" />
      </div>
      <div className="text-xl font-semibold text-purple-700 mt-2">{value}</div>
    </div>
  );
}


// Add this new component to the bottom of src/pages/SellerDashboard.js

function SalesChart({ data }) {
  // If there's no data, show a clear message.
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400">
        No sales data for this period yet.
      </div>
    );
  }

  // Find the highest sales value to create a scale.
  const maxSales = Math.max(...data.map(d => d.sales), 1);
  const scale = [
    { value: Math.ceil(maxSales / 1000) * 1000, label: `₹${(Math.ceil(maxSales / 1000) * 1000).toLocaleString()}` },
    { value: Math.ceil(maxSales / 2000) * 1000, label: `₹${(Math.ceil(maxSales / 2000) * 1000).toLocaleString()}` },
  ];

  return (
    <div className="h-48 relative">
      {/* Y-Axis Scale Lines and Labels */}
      <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-between">
        <div className="flex items-center">
          <span className="text-xs text-gray-400 mr-2">{scale[0].label}</span>
          <div className="flex-1 border-b border-gray-200 border-dashed"></div>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-gray-400 mr-2">{scale[1].label}</span>
          <div className="flex-1 border-b border-gray-200 border-dashed"></div>
        </div>
        <div>
          <span className="text-xs text-gray-400 mr-2">₹0</span>
          <div className="flex-1 border-b border-gray-300"></div>
        </div>
      </div>
      
      {/* Bars */}
      <div className="absolute bottom-0 left-[70px] right-0 h-full flex items-end gap-2 px-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-purple-600 rounded-t hover:bg-purple-500 transition-colors"
              style={{ height: `${(d.sales / maxSales) * 100}%` }}
              title={`${d.name}: ₹${Math.round(d.sales || 0).toLocaleString()}`}
            />
            <div className="text-xs text-gray-500">{d.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange, iconOn: IconOn = CheckCircle2, iconOff: IconOff = XCircle }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full border rounded-lg p-3 flex items-center justify-between ${checked ? "bg-purple-50 border-purple-200" : "bg-white"}`}
    >
      <span className="text-sm">{label}</span>
      <span className={`flex items-center gap-2 text-sm ${checked ? "text-purple-700" : "text-gray-500"}`}>
        {checked ? <IconOn size={16} /> : <IconOff size={16} />}
        {checked ? "On" : "Off"}
      </span>
    </button>
  );
}

function AISection({ title, icon: Icon, children, loading, expanded, onToggle }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Icon size={18} /> {title}
        </h3>
        <button className="text-gray-600" onClick={onToggle}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : expanded ? children : null}
    </div>
  );
}

function InsightRow({ left, right }) {
  return (
    <div className="flex items-center justify-between border rounded p-3">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function ConfirmDialog({ title, body, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 border-b">
          <div className="font-semibold">{title}</div>
        </div>
        <div className="p-4 text-sm text-gray-700">
          {body}
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-2 bg-purple-600 text-white rounded">Confirm</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Product Modal (NEW) ----------------------- */

function ProductModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setFormField,
  setImageAt,
  addImageField,
  removeImageField,
  isEditing = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEditing ? "Edit Product" : "Add Product"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-600">Product Name</label>
              <input
                type="text"
                className="mt-1 border rounded px-3 py-2 w-full"
                placeholder="Eg: Wireless Headphones"
                value={form.name}
                onChange={(e) => setFormField("name", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Description</label>
              <textarea
                className="mt-1 border rounded px-3 py-2 w-full"
                rows={4}
                placeholder="Short and crisp description…"
                value={form.description}
                onChange={(e) => setFormField("description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Price (₹)</label>
                <input
                  type="number"
                  className="mt-1 border rounded px-3 py-2 w-full"
                  value={form.price}
                  onChange={(e) => setFormField("price", Number(e.target.value))}
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Stock</label>
                <input
                  type="number"
                  className="mt-1 border rounded px-3 py-2 w-full"
                  value={form.stock}
                  onChange={(e) => setFormField("stock", Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600">Category</label>
              <input
                type="text"
                className="mt-1 border rounded px-3 py-2 w-full"
                placeholder="Eg: Electronics"
                value={form.category}
                onChange={(e) => setFormField("category", e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600">Image URLs</label>
                <button
                  className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
                  onClick={addImageField}
                  type="button"
                >
                  + Add Image
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {(form.images || [""]).map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      className="border rounded px-3 py-2 flex-1"
                      placeholder={`https://… image ${idx + 1}`}
                      value={url}
                      onChange={(e) => setImageAt(idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="px-3 py-2 border rounded text-red-600"
                      onClick={() => removeImageField(idx)}
                      disabled={(form.images || []).length <= 1}
                      title="Remove image"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            {isEditing ? "Update Product" : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- utilities ------------------------------- */

function avg(arr) {
  if (!arr?.length) return 0;
  return arr.reduce((a, b) => a + (Number(b) || 0), 0) / arr.length;
}

function pct(x) {
  if (x == null) return "0%";
  const v = Math.max(0, Math.min(1, Number(x)));
  return `${Math.round(v * 100)}%`;
}

function statusPill(s) {
  switch ((s || "").toLowerCase()) {
    case "pending": return "bg-yellow-100 text-yellow-700";
    case "processing": return "bg-blue-100 text-blue-700";
    case "shipped": return "bg-purple-100 text-purple-700";
    case "delivered": return "bg-green-100 text-green-700";
    case "cancelled": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
}