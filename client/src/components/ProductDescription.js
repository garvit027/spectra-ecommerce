import React from "react";

export default function ProductDescription({ product }) {
  if (!product.descriptionImages?.length && !product.fullDescription) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Product Details</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {product.descriptionImages.map((u, i) => (
          <img key={i} src={u} alt={`desc-${i}`} className="w-full h-48 object-cover rounded-lg" />
        ))}
      </div>
    </div>
  );
}