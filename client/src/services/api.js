import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({ baseURL: `${API}/api` });

export const imageUrl = (path) => (path ? `${API}${path}` : null);

// Change this to your client's currency
export const CURRENCY = "$";
export const formatPrice = (value) =>
  `${CURRENCY}${Number(value).toLocaleString()}`;

// Attach the admin token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If an admin request returns 401 (expired token), go back to login
api.interceptors.response.use(
  (response) => response,
  (err) => {
    if (err.response?.status === 401 && err.config.url.startsWith("/admin")) {
      localStorage.removeItem("admin-token");
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  },
);
