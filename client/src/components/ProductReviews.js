// src/components/product/ProductReviews.jsx
import React, { useMemo } from "react";
import { FaStar } from "react-icons/fa";

export default function ProductReviews({ product }) {
  const sortedReviews = useMemo(() => {
    return product.reviews.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [product.reviews]);

  const reviewCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    sortedReviews.forEach(r => {
      counts[r.rating - 1]++;
    });
    return counts;
  }, [sortedReviews]);

  const totalReviews = sortedReviews.length;
  const avgRating = product.rating?.toFixed?.(1) || (totalReviews > 0 ? (sortedReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1) : "0.0");

  const RatingBar = ({ rating, count }) => {
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium w-4">{rating}</span>
        <FaStar className="text-yellow-500 w-4 h-4" />
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-2xl font-semibold mb-6">Customer Reviews</h3>

      {totalReviews > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Overall Rating & Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-4xl font-bold text-gray-800">{avgRating}</span>
              <span className="text-2xl text-yellow-500">
                <FaStar />
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{totalReviews} ratings</p>

            <div className="space-y-1">
              {reviewCounts.slice().reverse().map((count, i) => (
                <RatingBar key={i} rating={5 - i} count={count} />
              ))}
            </div>
          </div>
          
          {/* List of Reviews */}
          <div className="space-y-6 max-h-96 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {sortedReviews.map((r) => (
              <div key={r._id || r.createdAt} className="pb-4 border-b last:border-b-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-800">{r.name}</span>
                  <span className="text-yellow-500 text-sm">★ {r.rating}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-500">Be the first to leave a review! 🎉</p>
      )}
    </div>
  );
}