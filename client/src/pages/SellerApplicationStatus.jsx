import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { CheckCircle, XCircle, Clock, ArrowRight, RefreshCw, LogOut, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function SellerApplicationStatus() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);

  const handleApplyAgain = async () => {
    if (!user?.token) return;

    setResetting(true);
    try {
      const res = await fetch(`${API_URL}/api/users/seller/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        updateUser(data.user);
        toast.success("Ready for a new application!");
        navigate("/apply-seller");
      } else {
        toast.error(data.error || "Failed to reset status.");
      }
    } catch (err) {
      console.error("Error resetting application:", err);
      toast.error("Server error. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const { sellerStatus, sellerRejectionReason, businessInfo } = user;

  // Render Pending State
  if (sellerStatus === "pending") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-50 text-amber-500 mb-6 border border-amber-100">
            <Clock size={48} className="animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
            Application Under Review
          </h1>
          <p className="text-gray-500 max-w-md mx-auto mb-8 text-sm leading-relaxed">
            Thank you for applying! Our admin team is reviewing your business details. We will notify you via email as soon as a decision is made.
          </p>

          {businessInfo && (
            <div className="bg-gray-50 rounded-2xl p-6 text-left mb-8 border border-gray-100 max-w-lg mx-auto">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                Submitted Business Info
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-400">Business Name</span>
                  <span className="font-semibold text-gray-700">{businessInfo.businessName}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-400">Type</span>
                  <span className="font-semibold text-gray-700">{businessInfo.businessType}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-400">Phone</span>
                  <span className="font-semibold text-gray-700">{businessInfo.phone}</span>
                </div>
                {businessInfo.taxId && (
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-400">Tax ID</span>
                    <span className="font-semibold text-gray-700">{businessInfo.taxId}</span>
                  </div>
                )}
                <div className="flex flex-col pt-1">
                  <span className="text-gray-400 mb-1">Description</span>
                  <span className="text-gray-600 italic bg-white p-3 rounded-lg border border-gray-100 text-xs">
                    {businessInfo.description}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Approved State
  if (sellerStatus === "approved" || user.isSeller) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-50 text-green-500 mb-6 border border-green-100">
            <CheckCircle size={48} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
            Welcome to the Team! 🎉
          </h1>
          <p className="text-gray-500 max-w-md mx-auto mb-8 text-sm leading-relaxed">
            Your application to become a seller has been approved. You are now ready to access the Seller Dashboard and list your products.
          </p>

          <div className="flex flex-col gap-3 justify-center max-w-xs mx-auto">
            <Link
              to="/seller/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg hover:shadow-purple-200 transition-all text-sm"
            >
              Go to Seller Dashboard
              <ArrowRight className="ml-2" size={16} />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Go to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Rejected State
  if (sellerStatus === "rejected") {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-50 text-red-500 mb-6 border border-red-100">
            <XCircle size={48} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
            Application Rejected
          </h1>
          <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm leading-relaxed">
            We appreciate your interest in selling on Spectra. Unfortunately, our admin team has rejected your application at this time.
          </p>

          <div className="bg-red-50/70 border border-red-100 rounded-2xl p-5 mb-8 text-left max-w-md mx-auto">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">
              Feedback from Administrator
            </span>
            <p className="text-red-700 text-sm italic">
              "{sellerRejectionReason || "No rejection details provided. Please review guidelines and try again."}"
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleApplyAgain}
              disabled={resetting}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg hover:shadow-purple-200 transition-all text-sm disabled:opacity-50"
            >
              {resetting ? (
                <>
                  <RefreshCw className="animate-spin mr-2" size={16} />
                  Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2" size={16} />
                  Apply Again
                </>
              )}
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fallback / No Application
  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center">
      <h1 className="text-2xl font-bold mb-4">No Application Found</h1>
      <p className="text-gray-600 mb-6">You have not submitted a seller application yet.</p>
      <Link
        to="/apply-seller"
        className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow transition text-sm"
      >
        Apply to Become Seller
      </Link>
    </div>
  );
}