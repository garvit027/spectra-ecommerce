import React, { useEffect, useState } from "react";
import ProductTable from "../components/ProductTable";

function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/products");
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("❌ Fetch failed:", err);
      setError("Failed to load products. Try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "Failed to delete product.");
        return;
      }
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Server error while deleting product.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📋 Admin Panel</h1>
        <button
          onClick={fetchProducts}
          disabled={loading}
          className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-red-600 font-semibold">{error}</p>
      )}

      {!loading && products.length === 0 && (
        <p className="text-gray-600 italic">No products available. Add some and watch this space glow! ✨</p>
      )}

      <ProductTable
        products={products}
        onDelete={handleDelete}
        deletingId={deletingId}
      />
    </div>
  );
}

export default AdminPanel;