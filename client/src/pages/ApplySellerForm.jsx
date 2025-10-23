import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function AdminSellerReview() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/api/users/seller/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setLoading(false);
    if (res.ok) navigate("/verified-success");
    else alert("Failed to approve");
  };

  const handleReject = async () => {
    if (!reason.trim()) return alert("Please provide a reason");
    setLoading(true);
    const res = await fetch(`${API_URL}/api/users/seller/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, reason }),
    });
    setLoading(false);
    if (res.ok) navigate("/rejected-status");
    else alert("Failed to reject");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6">
      <h1 className="text-4xl font-bold mb-6">Review Seller Application</h1>

      {!showRejectForm ? (
        <div className="flex gap-6">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg text-lg font-semibold"
          >
            ✅ Approve
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            className="bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg text-lg font-semibold"
          >
            ❌ Reject
          </button>
        </div>
      ) : (
        <div className="bg-white text-gray-900 p-6 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-4">Reject Application</h2>
          <textarea
            placeholder="Enter rejection reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded p-3 mb-4"
            rows={4}
          />
          <div className="flex gap-4">
            <button
              onClick={handleReject}
              disabled={loading}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Submit Rejection
            </button>
            <button
              onClick={() => setShowRejectForm(false)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}