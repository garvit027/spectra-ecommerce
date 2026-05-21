import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";
import {
  LayoutDashboard, Users, ShoppingBag, Package, 
  CheckCircle, XCircle, Clock, TrendingUp,
  ChevronDown, ChevronUp, Search, RefreshCw, Shield, LogOut, Eye, Loader2
} from "lucide-react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

/* ── helpers ─────────────────────────────────────────────── */
const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

const StatusBadge = ({ status }) => {
  const map = {
    pending:    "bg-yellow-100 text-yellow-800",
    approved:   "bg-green-100  text-green-800",
    rejected:   "bg-red-100    text-red-800",
    delivered:  "bg-blue-100   text-blue-800",
    shipped:    "bg-indigo-100 text-indigo-800",
    processing: "bg-orange-100 text-orange-800",
    paid:       "bg-green-100  text-green-800",
    unpaid:     "bg-red-100    text-red-800",
    cancelled:  "bg-gray-100   text-gray-600",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
};

/* ── TABS ─────────────────────────────────────────────────── */
const TABS = [
  { id: "overview",      label: "Overview",     icon: LayoutDashboard },
  { id: "applications",  label: "Seller Apps",  icon: Users },
  { id: "orders",        label: "Orders",       icon: ShoppingBag },
  { id: "products",      label: "Products",     icon: Package },
];

/* ═══════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const socket   = useSocket();

  const [tab,      setTab]      = useState("overview");
  const [stats,    setStats]    = useState(null);
  const [apps,     setApps]     = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [busy,     setBusy]     = useState({});
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(false);

  /* ── Guard ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!authLoading && !user?.isAdmin) navigate("/", { replace: true });
  }, [authLoading, user, navigate]);

  /* ── Fetch helpers ─────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const [appsRes, ordersRes, productsRes] = await Promise.all([
        fetch(`${API}/api/admin/seller-applications`, { headers: authHeaders(user.token) }),
        fetch(`${API}/api/orders`,                    { headers: authHeaders(user.token) }),
        fetch(`${API}/api/products/all/list`,          { headers: authHeaders(user.token) }),
      ]);
      const [appsData, ordersData, productsData] = await Promise.all([
        appsRes.json(), ordersRes.json(), productsRes.json()
      ]);

      const a = Array.isArray(appsData)    ? appsData    : [];
      const o = Array.isArray(ordersData)  ? ordersData  : [];
      const p = Array.isArray(productsData)? productsData: [];

      setApps(a);
      setOrders(o);
      setProducts(p);

      const totalRevenue = o.filter(x => x.paymentStatus === "paid")
                            .reduce((s, x) => s + (x.total || 0), 0);
      setStats({
        totalOrders:   o.length,
        totalRevenue,
        pendingApps:   a.length,
        totalProducts: p.length,
        paidOrders:    o.filter(x => x.paymentStatus === "paid").length,
        pendingOrders: o.filter(x => x.status === "pending").length,
      });
    } catch (e) {
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Real-time socket ──────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;
    const onNewOrder = () => { fetchAll(); toast("🛒 New order received!", { position: "bottom-right" }); };
    const onSellerApp = (d) => { fetchAll(); toast(`📋 New seller app: ${d.businessName}`, { position: "bottom-right" }); };
    socket.on("new_order", onNewOrder);
    socket.on("seller_application", onSellerApp);
    return () => { socket.off("new_order", onNewOrder); socket.off("seller_application", onSellerApp); };
  }, [socket, fetchAll]);

  /* ── Actions ───────────────────────────────────────────── */
  const approveApp = async (userId) => {
    setBusy(b => ({ ...b, [userId]: "approving" }));
    try {
      const res = await fetch(`${API}/api/admin/verify-seller-direct/${userId}`, {
        method: "POST", headers: authHeaders(user.token)
      });
      if (!res.ok) throw new Error();
      toast.success("Seller approved!");
      fetchAll();
    } catch { toast.error("Failed to approve."); }
    finally { setBusy(b => ({ ...b, [userId]: null })); }
  };

  const rejectApp = async (userId) => {
    const reason = window.prompt("Reason for rejection (optional):");
    if (reason === null) return;
    setBusy(b => ({ ...b, [userId]: "rejecting" }));
    try {
      const res = await fetch(`${API}/api/admin/reject-seller-direct/${userId}`, {
        method: "POST",
        headers: { ...authHeaders(user.token), "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) throw new Error();
      toast.success("Application rejected.");
      fetchAll();
    } catch { toast.error("Failed to reject."); }
    finally { setBusy(b => ({ ...b, [userId]: null })); }
  };

  const updateOrderStatus = async (orderId, status) => {
    setBusy(b => ({ ...b, [orderId]: true }));
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { ...authHeaders(user.token), "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
      toast.success(`Order marked as ${status}`);
    } catch { toast.error("Failed to update."); }
    finally { setBusy(b => ({ ...b, [orderId]: false })); }
  };

  const deleteProduct = async (pid) => {
    if (!window.confirm("Delete this product?")) return;
    setBusy(b => ({ ...b, [pid]: true }));
    try {
      const res = await fetch(`${API}/api/products/${pid}`, {
        method: "DELETE", headers: authHeaders(user.token)
      });
      if (!res.ok) throw new Error();
      setProducts(prev => prev.filter(p => p._id !== pid));
      toast.success("Product deleted.");
    } catch { toast.error("Failed to delete."); }
    finally { setBusy(b => ({ ...b, [pid]: false })); }
  };

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-purple-600" size={36} />
      </div>
    );
  }

  const filterSearch = (arr, fields) =>
    arr.filter(item => fields.some(f => String(item[f] || "").toLowerCase().includes(search.toLowerCase())));

  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-gradient-to-r from-purple-700 to-purple-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-purple-200" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Spectra Admin</h1>
            <p className="text-purple-300 text-xs">Signed in as {user.email}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchAll} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition">
            <LogOut className="w-4 h-4" /> Back to Store
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Nav */}
        <nav className="flex gap-1 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200 mb-6 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                tab === id
                  ? "bg-purple-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
              {id === "applications" && apps.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {apps.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ── OVERVIEW ─────────────────────────────────────── */}
        {tab === "overview" && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Orders",    value: stats.totalOrders,   color: "text-purple-600",  bg: "bg-purple-50" },
                { label: "Revenue (paid)",  value: `₹${stats.totalRevenue.toLocaleString()}`, color: "text-green-700", bg: "bg-green-50" },
                { label: "Pending Apps",   value: stats.pendingApps,   color: "text-yellow-700", bg: "bg-yellow-50" },
                { label: "Total Products", value: stats.totalProducts,  color: "text-blue-700",   bg: "bg-blue-50" },
                { label: "Paid Orders",    value: stats.paidOrders,    color: "text-green-700",  bg: "bg-green-50" },
                { label: "Pending Orders", value: stats.pendingOrders, color: "text-orange-700", bg: "bg-orange-50" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-4 border border-gray-100 shadow-sm`}>
                  <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Recent Orders</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      {["Order ID","Customer","Total","Payment","Status","Date"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.slice(0, 8).map(o => (
                      <tr key={o._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o._id.slice(-6).toUpperCase()}</td>
                        <td className="px-4 py-3 font-medium">{o.user?.name || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">₹{(o.total||0).toLocaleString()}</td>
                        <td className="px-4 py-3"><StatusBadge status={o.paymentStatus} /></td>
                        <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-4 py-3 text-gray-500">{new Date(o.placedAt||o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SELLER APPLICATIONS ──────────────────────────── */}
        {tab === "applications" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Pending Seller Applications ({apps.length})</h2>
              </div>
              {apps.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-300" />
                  <p>All clear — no pending applications!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {apps.map(app => (
                    <SellerAppRow key={app.userId} app={app} busy={busy} onApprove={approveApp} onReject={rejectApp} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ORDERS ──────────────────────────────────────── */}
        {tab === "orders" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <h2 className="font-semibold text-gray-800 flex-1">All Orders ({orders.length})</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search orders..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-52"/>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{["Order","Customer","Items","Total","Payment","Status","Update"].map(h=>(
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filterSearch(orders, ["status","paymentStatus"]).map(o => (
                    <tr key={o._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o._id.slice(-6).toUpperCase()}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{o.user?.name || "—"}</div>
                        <div className="text-xs text-gray-400">{o.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{o.items?.length || 0} item(s)</td>
                      <td className="px-4 py-3 font-bold text-gray-900">₹{(o.total||0).toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.paymentStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3">
                        <select disabled={busy[o._id]} defaultValue="" onChange={e => e.target.value && updateOrderStatus(o._id, e.target.value)}
                          className="border border-gray-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50">
                          <option value="" disabled>Change…</option>
                          {["pending","processing","shipped","delivered","cancelled"].map(s=>(
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PRODUCTS ─────────────────────────────────────── */}
        {tab === "products" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <h2 className="font-semibold text-gray-800 flex-1">All Products ({products.length})</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-52"/>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{["Image","Name","Seller","Price","Stock","Status","Actions"].map(h=>(
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filterSearch(products, ["name","category"]).map(p => (
                    <tr key={p._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <img src={p.images?.[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100"/>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 max-w-[200px] truncate">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.category}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{p.seller?.name || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₹{(p.price||0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${p.stock > 0 ? "text-green-600" : "text-red-500"}`}>{p.stock}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={() => navigate(`/product/${p._id}`)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteProduct(p._id)} disabled={busy[p._id]}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50" title="Delete">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Seller App Row (collapsible) ─────────────────────────── */
function SellerAppRow({ app, busy, onApprove, onReject }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{app.name}</span>
            <StatusBadge status="pending" />
          </div>
          <div className="text-sm text-gray-500 mt-0.5">{app.email} · {app.businessName}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onApprove(app.userId)} disabled={busy[app.userId]}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition disabled:opacity-50">
            {busy[app.userId] === "approving" ? <Loader2 className="w-3 h-3 animate-spin"/> : <CheckCircle className="w-3 h-3"/>} Approve
          </button>
          <button onClick={() => onReject(app.userId)} disabled={busy[app.userId]}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition disabled:opacity-50">
            {busy[app.userId] === "rejecting" ? <Loader2 className="w-3 h-3 animate-spin"/> : <XCircle className="w-3 h-3"/>} Reject
          </button>
          <button onClick={() => setOpen(o => !o)} className="p-1.5 text-gray-400 hover:text-gray-700">
            {open ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 rounded-xl p-4 text-sm">
          {[
            ["Business Type", app.businessType],
            ["Phone",         app.phone],
            ["Address",       app.address],
            ["Tax ID",        app.taxId || "N/A"],
            ["Applied At",    new Date(app.appliedAt).toLocaleDateString()],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-gray-400 font-medium">{k}</p>
              <p className="text-gray-800 font-medium">{v}</p>
            </div>
          ))}
          <div className="col-span-full">
            <p className="text-xs text-gray-400 font-medium">Description</p>
            <p className="text-gray-700">{app.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
