import axios from "axios";

// In local dev, VITE_API_URL is unset and requests go to "/api", which Vite's
// dev server proxies to http://localhost:5000 (see vite.config.js).
// In production on Vercel, set VITE_API_URL to your deployed backend's URL,
// e.g. https://your-backend.vercel.app/api
const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
