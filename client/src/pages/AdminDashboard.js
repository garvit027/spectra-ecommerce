// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/authContext";
import { toast } from "react-hot-toast";

/**
 * AdminDashboard component provides a full dashboard for admins and sellers
 * to manage products. It includes a single form for adding and
 * updating, and a list to view and delete existing products.
 *
 * It fetches products based on the user's role (admin sees all, seller sees their own).
 * It handles CRUD operations (Create, Read, Update, Delete) for products.
 * The form handles new product fields like 'images' and 'specifications'.
 */
const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    images: "", // comma-separated image URLs
    specifications: "", // JSON string of specifications
  });
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // --- Fetch products ---
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      let response;
      if (user?.isAdmin) {
        response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/products/all`,
          config
        );
      } else if (user?.isSeller) {
        response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/products/seller/${user.id}`,
          config
        );
      }

      setProducts(response?.data || []);
    } catch (err) {
      toast.error("Failed to fetch products.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) fetchProducts();
  }, [user, token]);

  // --- Handle input change ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- Handle edit ---
  const handleEditClick = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: product.price || "",
      category: product.category || "",
      stock: product.stock || "",
      images: Array.isArray(product.images)
        ? product.images.join(", ")
        : "",
      specifications: JSON.stringify(
        product.specifications && typeof product.specifications === "object"
          ? product.specifications
          : {},
        null,
        2
      ),
    });
  };

  // --- Handle form submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const payload = {
        ...formData,
        images: formData.images
          .split(",")
          .map((img) => img.trim())
          .filter((img) => img),
        specifications: JSON.parse(formData.specifications || "{}"),
      };

      if (editingProduct) {
        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/products/${editingProduct._id}`,
          payload,
          config
        );
        toast.success("Product updated successfully!");
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/api/products`,
          payload,
          config
        );
        toast.success("Product added successfully!");
      }

      setFormData({
        name: "",
        description: "",
        price: "",
        category: "",
        stock: "",
        images: "",
        specifications: "",
      });
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error(
        `Failed to ${editingProduct ? "update" : "add"} product.`
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Handle delete ---
  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };
        await axios.delete(
          `${process.env.REACT_APP_API_URL}/api/products/${productId}`,
          config
        );
        toast.success("Product deleted successfully!");
        setProducts((prev) => prev.filter((p) => p._id !== productId));
      } catch (err) {
        toast.error("Failed to delete product.");
        console.error(err);
      }
    }
  };

  // --- Render ---
  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          {user?.isAdmin ? "Admin Dashboard" : "Seller Dashboard"}
        </h1>

        {/* Form */}
        <div className="mb-10 p-6 bg-gray-50 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            {editingProduct ? "Update Product" : "Add New Product"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* --- Inputs --- */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="3"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              ></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price ($)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stock
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Image URLs (comma-separated)
              </label>
              <input
                type="text"
                name="images"
                value={formData.images}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Specifications (JSON format)
              </label>
              <textarea
                name="specifications"
                value={formData.specifications}
                onChange={handleChange}
                rows="5"
                placeholder={`Example:\n{\n  "Color": "Black",\n  "Material": "Leather"\n}`}
                className="mt-1 block w-full font-mono text-sm rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              ></textarea>
            </div>

            {/* --- Buttons --- */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : editingProduct
                ? "Update Product"
                : "Add Product"}
            </button>
            {editingProduct && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setFormData({
                    name: "",
                    description: "",
                    price: "",
                    category: "",
                    stock: "",
                    images: "",
                    specifications: "",
                  });
                }}
                className="w-full flex justify-center py-2 px-4 mt-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel Update
              </button>
            )}
          </form>
        </div>

        {/* Products List */}
        <div className="p-6 bg-gray-50 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Your Products
          </h2>
          {loading ? (
            <p className="text-center text-gray-500">Loading products...</p>
          ) : products.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {products.map((product) => (
                <li
                  key={product._id}
                  className="py-4 flex flex-col md:flex-row md:justify-between items-center"
                >
                  <div className="flex-1 w-full md:w-auto">
                    <h3 className="text-lg font-medium text-gray-900">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Price: ${product.price}
                    </p>
                    <p className="text-sm text-gray-500">
                      Stock: {product.stock}
                    </p>
                    {product.stock <= 0 && (
                      <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full mt-2">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  <div className="mt-4 md:mt-0 flex space-x-2">
                    <button
                      onClick={() => handleEditClick(product)}
                      className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product._id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500">
              No products found. Add a new one above!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;