import React, { useState } from "react";

const AddProduct = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image: "", // for URL
  });

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "image" && value.trim() !== "") {
      setImageFile(null); // clear file if user is typing URL
      setPreview(value);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setFormData((prev) => ({ ...prev, image: "" })); // clear URL if file chosen
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim() || !formData.price) {
      return alert("⚠ Please fill all required fields.");
    }

    if (!imageFile && !formData.image.trim()) {
      return alert("⚠ Please provide an image (file or URL).");
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("price", formData.price);

      if (imageFile) {
        data.append("imageFile", imageFile); // matches backend upload.single("imageFile")
      } else {
        data.append("image", formData.image.trim()); // matches backend req.body.image
      }

      const res = await fetch("http://localhost:8080/api/products", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }

      alert("🎉 Product added successfully!");
      setFormData({ name: "", description: "", price: "", image: "" });
      setImageFile(null);
      setPreview(null);
    } catch (err) {
      console.error("❌ Upload failed:", err.message);
      alert(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-purple-700">➕ Add Product</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Product Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <textarea
          name="description"
          placeholder="Product Description"
          value={formData.description}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="number"
          name="price"
          placeholder="Product Price"
          value={formData.price}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="url"
          name="image"
          placeholder="Image URL"
          value={formData.image}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          disabled={!!imageFile}
        />

        <div>
          <label className="block mb-1 text-sm font-medium">OR Upload Image File</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full border p-2 rounded"
            disabled={formData.image.trim() !== ""}
          />
        </div>

        {preview && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 mb-2">Image Preview:</p>
            <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded mx-auto border" />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Adding..." : "Add Product"}
        </button>
      </form>
    </div>
  );
};

export default AddProduct;