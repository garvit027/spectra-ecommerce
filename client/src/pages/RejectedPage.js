// client/src/pages/RejectedPage.jsx
import React from "react";
import { XCircle } from "lucide-react";

export default function RejectedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-400 to-rose-600 text-white text-center">
      <XCircle size={120} className="animate-bounce" />
      <h1 className="text-4xl font-bold mt-6 animate-fadeIn">
        Seller Application Rejected ❌
      </h1>
      <p className="mt-4 text-lg opacity-90">
        The applicant has been notified with the reason.
      </p>
    </div>
  );
}