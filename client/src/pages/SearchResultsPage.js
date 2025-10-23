import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductList from '../components/ProductList';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  // ✨ FIX: Changed 'q' to 'query' to match the Navbar and App.js
  const query = searchParams.get('query');
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        // This now correctly uses the 'q' parameter your backend expects
        const res = await fetch(`${API_URL}/api/products/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          throw new Error(`Server responded with status ${res.status}`);
        }
        const data = await res.json();
        setResults(data);
      } catch (err) {
        setError('Failed to fetch search results. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Search Results for: <span className="text-purple-700">"{query || ''}"</span>
      </h1>
      
      {/* We reuse the ProductList component to display the results */}
      <ProductList products={results} loading={loading} error={error} />
    </div>
  );
};

export default SearchResultsPage;