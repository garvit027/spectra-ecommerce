import { useState, useEffect } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const useProductData = (id) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProduct = async (productId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch product`);
      }
      const data = await res.json();
      setProduct(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  return { product, loading, error, fetchProduct };
};

export default useProductData;