import React from "react";
import ProductCard from "./ProductCard";

export default function ProductList({ products, loading, error }) {
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
      <p className="text-gray-500 font-medium">⏳ Loading premium products...</p>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center border border-red-100">
      ❌ {error}
    </div>
  );
  
  if (!products.length) return (
    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
      <p className="text-gray-400 font-medium italic">No products found matching your search.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
      {products.map((p) => (
        <ProductCard key={p._id} product={p} />
      ))}
    </div>
  );
}