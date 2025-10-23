// client/src/pages/VerifiedPage.jsx
import React, { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

export default function VerifiedPage() {
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowText(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-400 to-emerald-600 text-white text-center">
      <CheckCircle size={120} className="animate-bounce" />
      {showText && (
        <h1 className="text-4xl font-bold mt-6 animate-fadeIn">
          Seller Verified Successfully 🎉
        </h1>
      )}
      <p className="mt-4 text-lg opacity-90">
        The applicant is now a verified seller.
      </p>
    </div>
  );
}