// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/authContext";
import { toast } from "react-hot-toast";

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [products, setProducts] = useState([]);
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
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      let res;
      if (user?.isAdmin) {
        res = await axios.get(`${process.env.REACT_APP_API_URL}/api/products/all`, config);
      } else if (user?.isSeller) {
        res = await axios.get(`${process.env.REACT_APP_API_URL}/api/products/seller/${user.id}`, config);
      }
      setProducts(res.data);
    } catch (err) {
      toast.error("Failed to fetch products.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && token) fetchProducts();
  }, [user, token]);

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
      images: product.images.join(", "),
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
        await axios.put(`${process.env.REACT_APP_API_URL}/api/products/${editingProduct._id}`, payload, config);
        toast.success("✅ Product updated");
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/products`, payload, config);
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
        await axios.delete(`${process.env.REACT_APP_API_URL}/api/products/${id}`, config);
        setProducts(products.filter((p) => p._id !== id));
        toast.success("🗑️ Product deleted");
      } catch {
        toast.error("❌ Error deleting product");
      }
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-soft p-8">
        <h1 className="text-3xl font-bold text-center text-brand-purple mb-8">
          {user?.isAdmin ? "Admin Dashboard" : "Seller Dashboard"}
        </h1>

        {/* --- Form --- */}
        <div className="mb-10 p-6 bg-brand-light rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {editingProduct ? "Update Product" : "Add Product"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Product Name" required
              className="w-full border rounded-md p-2 focus:ring-brand-purple focus:border-brand-purple" />
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" required
              className="w-full border rounded-md p-2 focus:ring-brand-purple focus:border-brand-purple" />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price"
                className="border rounded-md p-2 focus:ring-brand-purple focus:border-brand-purple" />
              <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="Stock"
                className="border rounded-md p-2 focus:ring-brand-purple focus:border-brand-purple" />
            </div>
            <input name="category" value={formData.category} onChange={handleChange} placeholder="Category"
              className="w-full border rounded-md p-2 focus:ring-brand-purple focus:border-brand-purple" />
            <input name="images" value={formData.images} onChange={handleChange} placeholder="Image URLs (comma separated)"
              className="w-full border rounded-md p-2 focus:ring-brand-purple focus:border-brand-purple" />
            <textarea name="specifications" value={formData.specifications} onChange={handleChange} rows="4"
              placeholder={`{ "Color": "Black", "Weight": "1kg" }`}
              className="w-full border rounded-md font-mono text-sm p-2 focus:ring-brand-purple focus:border-brand-purple" />
            <button type="submit" disabled={loading}
              className="w-full py-2 bg-brand-purple text-white rounded-md hover:bg-purple-800 disabled:opacity-50">
              {loading ? "Processing..." : editingProduct ? "Update Product" : "Add Product"}
            </button>
          </form>
        </div>

        {/* --- Product List --- */}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Products</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : products.length ? (
            <ul className="divide-y">
              {products.map((p) => (
                <li key={p._id} className="py-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">{p.name}</h3>
                    <p className="text-gray-500">${p.price}</p>
                    {p.stock <= 0 && (
                      <span className="text-xs text-red-600 font-semibold">Out of Stock</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditClick(p)}
                      className="px-3 py-1 bg-brand-light text-brand-purple rounded hover:bg-purple-100">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteProduct(p._id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No products yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;