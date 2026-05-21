import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { Store, Shield, MapPin, Package, Star } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function SellerStore() {
  const { sellerId } = useParams();
  const [products, setProducts] = useState([]);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStore() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/products/seller/${sellerId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load store");
        
        setProducts(data.products || []);
        setSeller(data.seller);
        if (data.onVacation) {
          setError("This store is currently on holiday mode.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, [sellerId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl max-w-md text-center border border-red-100">
        <p className="font-bold mb-2">Error loading store</p>
        <p>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Seller Header Banner */}
      <div className="bg-purple-700 text-white pt-24 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute transform -rotate-12 -left-10 top-0">
            <Store size={200} />
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-white text-purple-700 flex items-center justify-center text-4xl font-bold shadow-xl border-4 border-purple-400/30">
              {seller?.name?.charAt(0).toUpperCase() || "S"}
            </div>
            
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-extrabold">{seller?.name}'s Store</h1>
                {seller?.sellerStatus === "approved" && (
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-white/30">
                    <Shield size={14} className="fill-white" />
                    VERIFIED
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-purple-100 text-sm">
                <div className="flex items-center gap-1">
                  <Package size={16} />
                  <span>{products.length} Products</span>
                </div>
                {seller?.businessInfo?.address && (
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    <span>{seller.businessInfo.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Star size={16} className="fill-yellow-400 text-yellow-400" />
                  <span>Top Rated Merchant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="bg-white rounded-3xl shadow-xl p-8 min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Featured Collections</h2>
            <div className="h-1 flex-grow mx-8 bg-gray-50 rounded-full"></div>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Package size={64} className="mb-4 opacity-20" />
              <p className="text-xl font-medium">This store is currently restocked.</p>
              <p className="text-sm">Check back soon for new arrivals!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
