import React, { useState, useMemo } from "react";

export default function ProductGallery({ product }) {
  const galleryImages = useMemo(() => {
    const images = [
      ...(product?.bannerImages || []),
      ...(product?.images || []),
    ];
    return Array.from(new Set(images));
  }, [product]);

  const [activeImg, setActiveImg] = useState(galleryImages[0] || null);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="w-full h-96 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
        {activeImg ? (
          <img src={activeImg} alt={product.name} className="object-contain max-h-full" />
        ) : (
          <div className="text-gray-400">No Image</div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-5 gap-3">
        {galleryImages.map((url, i) => (
          <button
            key={i}
            onClick={() => setActiveImg(url)}
            className={`h-20 rounded-lg overflow-hidden border transition-all duration-200 hover:shadow-md ${
              activeImg === url ? "border-purple-600 ring-2 ring-purple-600" : "border-gray-200"
            }`}
          >
            <img src={url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}