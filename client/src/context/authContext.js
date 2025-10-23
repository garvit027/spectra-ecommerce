import React, { createContext, useState, useEffect, useContext, useCallback } from "react";

const AuthContext = createContext(null);
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Login: Save to both localStorage and state
  const login = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  // ✅ Logout: Clear user completely
  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  // ✅ Update user data (merge new data, preserve token)
  const updateUser = (updatedUserData) => {
    const currentUser = user || {};
    const mergedUser = {
      ...currentUser,
      ...updatedUserData,
      token: updatedUserData.token || currentUser.token,
    };

    // 🧠 Only update if data actually changed (prevents infinite rerenders)
    const prevUser = localStorage.getItem("user");
    if (prevUser && JSON.stringify(JSON.parse(prevUser)) === JSON.stringify(mergedUser)) {
      return; // No change, skip update
    }

    localStorage.setItem("user", JSON.stringify(mergedUser));
    setUser(mergedUser);
  };

  // ✅ Fetch user with token refresh
  const fetchUserWithRefresh = useCallback(async () => {
    let storedUser;

    try {
      storedUser = JSON.parse(localStorage.getItem("user"));
    } catch {
      setLoading(false);
      return;
    }

    if (!storedUser?.token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${storedUser.token}` },
      });

      const refreshToken = res.headers.get("x-refresh-token");

      if (res.status === 401) {
        console.warn("🔒 Token expired — logging out.");
        logout();
      } else if (res.ok) {
        const data = await res.json();

        const updatedUser = {
          ...data,
          token: refreshToken || storedUser.token,
        };

        // 🧠 Only update if there’s an actual difference
        if (JSON.stringify(user) !== JSON.stringify(updatedUser)) {
          updateUser(updatedUser);
        }
      } else {
        console.error("⚠️ Failed to fetch user:", res.status);
        // Keep old data if fetch fails but wasn't unauthorized
        if (!user && storedUser) {
          setUser(storedUser);
        }
      }
    } catch (err) {
      console.error("🚨 Error fetching user profile:", err);
      // Keep cached user on network error
      if (!user && storedUser) {
        setUser(storedUser);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ✅ Run once on mount
  useEffect(() => {
    fetchUserWithRefresh();
  }, [fetchUserWithRefresh]);

  const value = { user, login, logout, updateUser, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ✅ Custom hook
export const useAuth = () => useContext(AuthContext);
