// src/components/product/ReviewForm.jsx
import React, { useState } from "react";
import StarRating from "./StarRating"; // New component

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function ReviewForm({ user, productId, onReviewAdded, showToast }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please log in to add a review.", "error");
      return;
    }
    if (!rating || !comment.trim()) {
      showToast("Please add a rating and comment.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Failed to add review");
      }
      setComment("");
      setRating(5);
      onReviewAdded();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24 transform transition-all duration-300 hover:shadow-2xl">
      <h3 className="text-xl font-semibold mb-3">Write a Review</h3>
      {!user ? (
        <p className="text-gray-500">Please log in to add a review.</p>
      ) : (
        <form onSubmit={submitReview} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <StarRating rating={rating} setRating={setRating} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
              placeholder="Share details of your experience with the product..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-full py-3 font-semibold disabled:opacity-50 transition-colors duration-200"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}
    </div>
  );
}