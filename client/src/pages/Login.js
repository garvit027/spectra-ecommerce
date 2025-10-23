import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// ✅ 1. Import the useAuth hook
import { useAuth } from "../context/authContext";

// ✅ 2. Rename component to Login and remove 'setUser' prop
const Login = () => {
  const navigate = useNavigate();
  // ✅ 3. Get the global 'login' function from the context
  const { login } = useAuth();

  // State for the login/signup process
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); 
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // State for the signup form data
  const [signupData, setSignupData] = useState({
    name: "",
    contactNo: "",
    age: "",
  });

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      let res, data;
      // Note: Make sure this is your correct backend URL
      const API_URL = "http://localhost:8080/api/users"; 
      
      if (step === 1) {
        // Step 1: Send OTP
        if (!email.trim()) {
          setMessage("Please enter your email.");
          setLoading(false); // Stop loading
          return;
        }
        res = await fetch(`${API_URL}/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        data = await res.json();
        if (res.ok) {
          setMessage("OTP sent! Please check your inbox.");
          setStep(2);
        } else {
          setMessage(data.error || "Failed to send OTP.");
        }

      } else if (step === 2) {
        // Step 2: Verify OTP
        if (!otp.trim()) {
          setMessage("Please enter the OTP.");
          setLoading(false); // Stop loading
          return;
        }
        res = await fetch(`${API_URL}/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });
        data = await res.json();
        if (res.ok) {
          if (data.userExists) {
            const userWithToken = { ...data.user, token: data.token };
            // ✅ 4. Call the global login function
            login(userWithToken); 
            navigate("/");
          } else {
            setMessage("OTP verified. Please complete your profile.");
            setStep(3); // Go to signup form
          }
        } else {
          setMessage(data.error || "Invalid OTP. Please try again.");
        }

      } else if (step === 3) {
        // Step 3: Complete signup
        const { name, contactNo, age } = signupData;
        if (!name.trim() || !contactNo.trim() || !age.trim()) {
          setMessage("Please fill in all details.");
          setLoading(false); // Stop loading
          return;
        }
        if (!/^\d{10}$/.test(contactNo)) {
          setMessage("Please enter a valid 10-digit mobile number.");
          setLoading(false); // Stop loading
          return;
        }
        res = await fetch(`${API_URL}/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, contactNo, age, email }),
        });
        data = await res.json();
        if (res.ok) {
          const userWithToken = { ...data.user, token: data.token };
          // ✅ 5. Call the global login function
          login(userWithToken);
          navigate("/");
        } else {
          setMessage(data.error || "Signup failed.");
        }
      }
    } catch (err) {
      console.error("API error:", err);
      setMessage("⚠️ A server error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // UI rendering for each step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 w-full rounded mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded w-full hover:bg-purple-700 transition duration-300"
            >
              {loading ? "Sending OTP..." : "Continue"}
            </button>
          </>
        );
      case 2:
        return (
          <>
            <p className="text-sm text-gray-500 mb-4">An OTP has been sent to {email}.</p>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="border p-2 w-full rounded mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded w-full hover:bg-green-700 transition duration-300"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Complete your profile</p>
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              value={signupData.name}
              onChange={handleSignupChange}
              className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <input
              type="tel"
              name="contactNo"
              placeholder="Mobile Number (10 digits)"
              value={signupData.contactNo}
              onChange={handleSignupChange}
              maxLength={10}
              className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <input
              type="number"
              name="age"
              placeholder="Your Age"
              value={signupData.age}
              onChange={handleSignupChange}
              className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 transition duration-300"
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-xl mt-20">
      <h2 className="text-2xl font-bold mb-4 text-center text-purple-700">
        Login or Sign Up
      </h2>
      <form onSubmit={handleSubmit}>
        {renderStep()}
      </form>
      {message && (
        <p className={`mt-4 text-center text-sm ${message.startsWith('⚠️') ? 'text-red-600' : 'text-gray-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
};

// ✅ 6. Export as Login
export default Login;
