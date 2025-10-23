// src/pages/SellerDecision.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import Confetti from "react-confetti";
import { CheckCircle, XCircle } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function SellerDecision() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const statusFromUrl = searchParams.get("status"); // "approved" or "rejected"

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submitDecision = async (status, reasonText) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/seller/decision/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: reasonText }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
      } else {
        setError(data.error || "Error updating seller");
      }
    } catch {
      setError("Server error");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (statusFromUrl === "approved") {
      submitDecision("approved");
    }
  }, [statusFromUrl]);

  if (done && statusFromUrl === "approved") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <Confetti />
        <CheckCircle size={80} className="text-green-500 mb-4" />
        <h1 className="text-3xl font-bold">Seller Verified ✅</h1>
        <p className="mt-2 text-gray-600">They can now sell on Spectra!</p>
      </div>
    );
  }

  if (statusFromUrl === "rejected" && !done) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <XCircle size={60} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-4">Reject Seller Application</h2>
        <textarea
          placeholder="Reason for rejection..."
          className="border p-2 rounded w-full max-w-md"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          onClick={() => submitDecision("rejected", reason)}
          disabled={loading}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg"
        >
          {loading ? "Submitting..." : "Reject Application"}
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  if (done && statusFromUrl === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <XCircle size={80} className="text-red-500 mb-4" />
        <h1 className="text-3xl font-bold">Seller Rejected</h1>
        <p className="mt-2 text-gray-600">The seller has been notified.</p>
      </div>
    );
  }

  return <p className="text-center mt-20">Processing decision...</p>;
}