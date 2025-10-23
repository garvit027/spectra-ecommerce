import { useState, useEffect } from "react";

function ApplySeller() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user data from localStorage on component mount
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  const handleApply = async () => {
    if (!user?.token) {
      setMessage("⚠️ You must be logged in to apply as a seller.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:8080/api/users/apply-seller", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Your request to become a seller has been sent.");
        // Optional: update local user state if needed to show pending badge immediately
        setUser(prev => ({ ...prev, sellerRequest: true }));
      } else {
        setMessage(data.error || "Failed to apply as seller.");
      }
    } catch (err) {
      console.error("Error applying as seller:", err);
      setMessage("Server error while applying.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-24 bg-white shadow-lg rounded-xl p-6 text-center">
        <h2 className="text-2xl font-bold text-purple-700 mb-4">Apply as Seller</h2>
        <p className="mb-6 text-gray-600">Loading user info...</p>
      </div>
    );
  }

  const { isSeller, sellerRequest } = user;

  return (
    <div className="max-w-md mx-auto mt-24 bg-white shadow-lg rounded-xl p-6 text-center">
      <h2 className="text-2xl font-bold text-purple-700 mb-4">Apply as Seller</h2>
      <p className="mb-6 text-gray-600">
        Apply to become a seller and start listing your products on our platform.
      </p>

      {/* Seller Status Badges */}
      {isSeller && (
        <p className="mb-4 text-green-600 font-semibold">You are already a Seller ✅</p>
      )}
      {!isSeller && sellerRequest && (
        <p className="mb-4 text-yellow-600 font-semibold">Your seller request is pending ⏳</p>
      )}

      {/* Show apply button only if not seller and no pending request */}
      {!isSeller && !sellerRequest && (
        <button
          onClick={handleApply}
          disabled={loading}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition disabled:opacity-50"
          aria-busy={loading}
          aria-disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      )}

      {/* Show messages */}
      {message && (
        <p className="mt-4 text-sm text-gray-700">{message}</p>
      )}
    </div>
  );
}

export default ApplySeller;