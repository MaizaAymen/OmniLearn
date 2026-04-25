import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import axios from "axios";
import Cookies from "js-cookie";

axios.interceptors.request.use((cfg) => {
  const t = Cookies.get("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
const _fetch = window.fetch.bind(window);
window.fetch = (url, opts = {}) => {
  const t = Cookies.get("token");
  if (t && typeof url === "string" && url.includes("/api/")) {
    opts.headers = { ...(opts.headers || {}), Authorization: `Bearer ${t}` };
  }
  return _fetch(url, opts);
};

axios.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      Cookies.remove("token");
      Cookies.remove("user");
      if (!window.location.pathname.startsWith("/auth")) window.location.href = "/auth";
    }
    return Promise.reject(err);
  }
);

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "YOUR_GOOGLE_CLIENT_ID";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);