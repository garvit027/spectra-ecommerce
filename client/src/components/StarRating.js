// src/components/product/StarRating.jsx
import React from "react";
import { FaStar } from "react-icons/fa";

export default function StarRating({ rating, setRating }) {
  const stars = [...Array(5)].map((_, index) => {
    const ratingValue = index + 1;
    return (
      <label key={index}>
        <input
          type="radio"
          name="rating"
          value={ratingValue}
          onClick={() => setRating(ratingValue)}
          className="hidden"
        />
        <FaStar
          className="cursor-pointer transition-colors duration-200"
          color={ratingValue <= rating ? "#ffc107" : "#e4e5e9"}
          size={24}
        />
      </label>
    );
  });
  return <div className="flex gap-1">{stars}</div>;
}