import React from "react";

function AdminPanel({ products = [], refreshProducts }) {
  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this product?");
    if (!confirm) return;

    try {
      const res = await fetch(`http://localhost:8080/api/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      alert("🗑️ Product deleted!");
      refreshProducts(); // re-fetch the updated product list
    } catch (err) {
      console.error("❌ Delete error:", err);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
      {products.map((product) => (
        <div key={product._id} className="bg-white p-4 rounded-lg shadow">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-40 object-cover rounded"
          />
          <h3 className="text-lg font-bold mt-2">{product.name}</h3>
          <p className="text-sm text-gray-500">{product.description}</p>
          <p className="text-purple-600 font-semibold mt-1">₹{product.price}</p>
          <button
            onClick={() => handleDelete(product._id)}
            className="mt-3 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
          >
            Delete ❌
          </button>
        </div>
      ))}
    </div>
  );
}

export default AdminPanel;