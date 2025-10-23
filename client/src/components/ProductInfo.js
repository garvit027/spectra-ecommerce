import React from "react";

export default function ProductInfo({ product }) {
  const avgRating = product.rating?.toFixed?.(1) || (product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length)?.toFixed(1) || 0;
  const numReviews = product.numReviews || product.reviews?.length || 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800">{product.name}</h1>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-yellow-500 font-bold text-lg">★ {avgRating}</span>
        <span className="text-sm text-gray-500">({numReviews} ratings)</span>
      </div>

      <div className="text-4xl font-bold text-purple-700 mt-4">₹{product.price}</div>

      <div className="mt-6">
        <h3 className="font-semibold mb-2 text-lg">Description</h3>
        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{product.description}</p>
      </div>

      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3 text-lg">Specifications</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key} className="flex justify-between bg-gray-50 rounded-lg p-3">
                <span className="text-gray-600">{key}</span>
                <span className="font-medium text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}