// src/pages/AdminSellerReview.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function AdminSellerReview() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchApplication() {
      try {
        const res = await fetch(`${API_URL}/api/users/seller/review/${token}`);
        if (!res.ok) throw new Error("Failed to fetch application");
        const data = await res.json();
        setApplication(data);
      } catch (err) {
        setError(err.message || "Error loading application");
      } finally {
        setLoading(false);
      }
    }
    fetchApplication();
  }, [token]);

  async function handleApprove() {
    if (!window.confirm("Are you sure you want to approve this seller?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/seller/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");
      alert("✅ Seller approved successfully!");
      navigate("/verified-success");
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!window.confirm("Are you sure you want to reject this seller?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/seller/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed");
      alert("🚫 Seller rejected successfully!");
      navigate("/rejected-status");
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p className="text-center mt-10">⏳ Loading...</p>;
  if (error) return <p className="text-center text-red-500 mt-10">{error}</p>;
  if (!application) return <p className="text-center mt-10">Application not found.</p>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-10">
      <h1 className="text-2xl font-bold mb-4">Review Seller Application</h1>

      <table className="w-full mb-6 border">
        <tbody>
          <tr><td className="p-2 font-semibold border">Email</td><td className="p-2 border">{application.email}</td></tr>
          <tr><td className="p-2 font-semibold border">Business Name</td><td className="p-2 border">{application.businessName}</td></tr>
          <tr><td className="p-2 font-semibold border">Type</td><td className="p-2 border">{application.businessType}</td></tr>
          <tr><td className="p-2 font-semibold border">Phone</td><td className="p-2 border">{application.phone}</td></tr>
          <tr><td className="p-2 font-semibold border">Address</td><td className="p-2 border">{application.address}</td></tr>
          <tr><td className="p-2 font-semibold border">Tax ID</td><td className="p-2 border">{application.taxId || "-"}</td></tr>
          <tr><td className="p-2 font-semibold border">Description</td><td className="p-2 border">{application.description}</td></tr>
        </tbody>
      </table>

      <label className="block mb-2 font-semibold">Rejection Reason (optional):</label>
      <textarea
        className="w-full border rounded p-2 mb-4"
        rows="3"
        placeholder="Enter reason if rejecting..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      ></textarea>

      <div className="flex gap-4">
        <button
          onClick={handleApprove}
          disabled={actionLoading}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          {actionLoading ? "Processing..." : "✅ Approve"}
        </button>
        <button
          onClick={handleReject}
          disabled={actionLoading}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          {actionLoading ? "Processing..." : "🚫 Reject"}
        </button>
      </div>
    </div>
  );
}