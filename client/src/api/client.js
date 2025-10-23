const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

// This remains the fallback if no token is explicitly passed
export const getToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.token || null;
  } catch {
    return null;
  }
};

// We won't use this directly in api.post anymore, but keep it for other uses
export const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- Updated API Client ---
export const api = {
  // GET (Updated to accept explicit token)
  get: async (url, opts = {}) => {
    const headers = { ...opts.headers };
    // Use passed token if available, otherwise fallback to localStorage
    const token = opts.token || getToken(); 
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_URL}${url}`, { headers });

    // Handle Auth errors
    if (res.status === 401) {
      // Consider calling logout() from context here if you import it
      throw new Error("Unauthorized - Please log in again."); 
    }
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `HTTP error ${res.status}` }));
        throw new Error(errorData.message || `HTTP error ${res.status}`);
    }
    return res.json();
  },

  // POST (Updated to accept explicit token)
  post: async (url, body, opts = {}) => {
    const headers = { "Content-Type": "application/json", ...opts.headers };
    // Use passed token if available, otherwise fallback to localStorage
    const token = opts.token || getToken(); 
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${url}`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    // Handle Auth errors
    if (res.status === 401) {
        // Consider calling logout() from context here if you import it
        throw new Error("Unauthorized - Please log in again."); 
    }
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `HTTP error ${res.status}` }));
        throw new Error(errorData.message || `HTTP error ${res.status}`);
    }
    return res.json();
  },
  
  // You should update put, patch, delete similarly if you use them
};

export default api;
export { API_URL };
