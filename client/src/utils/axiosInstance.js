// src/utils/axiosInstance.js
import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8080",
  withCredentials: false,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // ensure you actually store it here on login
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;