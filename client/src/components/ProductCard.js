import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Star } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

/**
 * A reusable card component to display product information.
 */
function ProductCard({ product }) {

  // Image URL logic (prioritize primary product image over banner)
  const imagePath = product.images?.[0] || product.bannerImages?.[0];
  let imageSrc;
  if (imagePath?.startsWith('http')) {
    imageSrc = imagePath;
  } else if (imagePath) {
    imageSrc = `${API_URL}/${imagePath.startsWith('/') ? imagePath.substring(1) : imagePath}`;
  } else {
    imageSrc = "https://placehold.co/400x300?text=No+Image";
  }

  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-gray-100 overflow-hidden relative">
      {/* Verified Seller Badge */}
      {product.seller?.sellerStatus === "approved" && (
        <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-md text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg border border-purple-100">
           <CheckCircle size={12} className="text-purple-600" />
           <span>VERIFIED SELLER</span>
        </div>
      )}

      {/* Link to the product details page */}
      <Link to={`/product/${product._id}`} className="flex flex-col h-full">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300?text=No+Image'; }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
        </div>

        <div className="p-4 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-purple-700 transition-colors">
              {product.name}
            </h3>
          </div>
          
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-grow">
            {product.description}
          </p>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <span className="text-lg font-extrabold text-purple-700">₹{product.price}</span>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                <span>{product.rating?.toFixed(1) || "0.0"} ({product.numReviews || 0})</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default ProductCard;
