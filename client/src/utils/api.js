// src/utils/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8080/api", // adjust if using deployed server
  withCredentials: true,
});

// Interceptor: attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // where you store login token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;