// src/pages/SellerApplicationStatus.jsx
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

export default function SellerApplicationStatus() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const status = queryParams.get("status"); // approved, rejected, error, info
  const message = queryParams.get("message") || "";

  let icon, bgClass, title;

  switch (status) {
    case "approved":
      icon = <CheckCircle size={120} className="animate-bounce" />;
      bgClass = "from-green-400 to-emerald-600";
      title = "Seller Verified 🎉";
      break;
    case "rejected":
      icon = <XCircle size={120} className="animate-bounce" />;
      bgClass = "from-red-400 to-rose-600";
      title = "Seller Application Rejected ❌";
      break;
    case "error":
      icon = <AlertTriangle size={120} className="animate-bounce" />;
      bgClass = "from-yellow-400 to-orange-500";
      title = "Error Processing Application ⚠️";
      break;
    case "info":
      icon = <Info size={120} className="animate-bounce" />;
      bgClass = "from-blue-400 to-indigo-600";
      title = "Application Status ℹ️";
      break;
    default:
      icon = <Info size={120} className="animate-bounce" />;
      bgClass = "from-purple-400 to-indigo-600";
      title = "Seller Application Status";
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${bgClass} text-white text-center p-6`}
    >
      {icon}
      <h1 className="text-4xl font-bold mt-6">{title}</h1>
      {message && <p className="mt-4 text-lg max-w-lg">{decodeURIComponent(message)}</p>}
      
      <Link
        to="/"
        className="mt-6 inline-block bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold shadow hover:bg-gray-100 transition"
      >
        Go to Home
      </Link>
    </div>
  );
}