// src/components/ApplySellerForm.jsx
import React, { useState } from "react";
import { X } from "lucide-react";

// ✅ CRA-compatible env var
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function ApplySellerForm({ user, onClose, setMessage, setUser, userLocation }) {
  const [formData, setFormData] = useState({
    businessName: user.businessInfo?.businessName || "",
    businessType: user.businessInfo?.businessType || "",
    address: user.businessInfo?.address || userLocation || "",
    phone: user.businessInfo?.phone || "",
    taxId: user.businessInfo?.taxId || "",
    description: user.businessInfo?.description || "",
  });
  const [otp, setOtp] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const token = JSON.parse(localStorage.getItem("user"))?.token;

  const onChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const sendOtp = async () => {
    if (!formData.phone) return setMessage("Please enter phone");
    setSendingOtp(true);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/users/seller/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: formData.phone }),
      });
      const data = await res.json();
      if (res.ok) setMessage("OTP sent to your mobile");
      else setMessage(data.error || "Failed to send OTP");
    } catch {
      setMessage("Server error sending OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) return setMessage("Enter the OTP");
    setVerifyingOtp(true);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/users/seller/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: formData.phone, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setMobileVerified(true);
        setMessage("Mobile verified ✅");
      } else {
        setMessage(data.error || "Invalid OTP");
      }
    } catch {
      setMessage("Server error verifying OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!mobileVerified) return setMessage("Please verify your mobile first");
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/users/seller/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        const stored = JSON.parse(localStorage.getItem("user"));
        const updatedUser = { ...stored, ...data.user, token: stored.token };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setMessage("Application submitted! We’ll email admin for review.");
        onClose();
      } else {
        setMessage(data.error || "Failed to submit application");
      }
    } catch {
      setMessage("Server error submitting application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Apply as Seller</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submitApplication} className="space-y-3">
          <input
            name="businessName"
            value={formData.businessName}
            onChange={onChange}
            placeholder="Business Name"
            className="w-full border p-2 rounded"
            required
          />
          <select
            name="businessType"
            value={formData.businessType}
            onChange={onChange}
            className="w-full border p-2 rounded"
            required
          >
            <option value="">Business Type</option>
            <option value="individual">Individual</option>
            <option value="small_business">Small Business</option>
            <option value="corporation">Corporation</option>
          </select>
          <input
            name="address"
            value={formData.address}
            onChange={onChange}
            placeholder="Business Address"
            className="w-full border p-2 rounded"
            required
          />
          <div className="flex gap-2">
            <input
              name="phone"
              value={formData.phone}
              onChange={onChange}
              placeholder="Mobile (E.164 e.g. +91XXXXXXXXXX)"
              className="flex-1 border p-2 rounded"
              required
            />
            <button
              type="button"
              onClick={sendOtp}
              disabled={sendingOtp || mobileVerified}
              className="px-3 py-2 rounded bg-purple-600 text-white disabled:opacity-60"
            >
              {sendingOtp
                ? "Sending..."
                : mobileVerified
                ? "Verified"
                : "Send OTP"}
            </button>
          </div>
          {!mobileVerified && (
            <div className="flex gap-2">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                className="flex-1 border p-2 rounded"
              />
              <button
                type="button"
                onClick={verifyOtp}
                disabled={verifyingOtp}
                className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-60"
              >
                {verifyingOtp ? "Verifying..." : "Verify"}
              </button>
            </div>
          )}
          <input
            name="taxId"
            value={formData.taxId}
            onChange={onChange}
            placeholder="Tax ID (optional)"
            className="w-full border p-2 rounded"
          />
          <textarea
            name="description"
            value={formData.description}
            onChange={onChange}
            placeholder="Business Description"
            className="w-full border p-2 rounded h-24"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 text-white py-2 rounded"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
