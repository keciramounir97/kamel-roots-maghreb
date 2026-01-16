import axios from "axios";

/**
 * ===============================
 * API ROOT RESOLUTION (PRO SAFE)
 * ===============================
 *
 * - In production (Vite build): use SAME DOMAIN → ""
 * - In dev: use localhost backend
 *
 * ⚠️ DO NOT rely on cPanel env for Vite (build-time only)
 */
const API_ROOT = (() => {
  // 1. Development mode always uses local backend
  if (import.meta.env.DEV) {
    return "http://localhost:5000";
  }

  // 2. Browser check: If running on localhost or local network, force local backend
  // This allows "vite preview" or local builds to work with local backend
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // Localhost / Loopback / Local Network
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.")
    ) {
      return "http://localhost:5000";
    }
  }

  // 3. Environment Variable (from .env.production)
  // Only use this if we are NOT on localhost
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return fromEnv;

  // 4. Fallback hardcoded production
  return "https://server.rootsmaghreb.com";
})();

const NORMALIZED_API_ROOT = API_ROOT.replace(/\/+$/, "");

/**
 * ===============================
 * AXIOS INSTANCE
 * ===============================
 */
export const api = axios.create({
  baseURL: `${NORMALIZED_API_ROOT}/api`,
  timeout: 15000,
  headers: {
    Accept: "application/json",
  },
  withCredentials: false, // JWT is via Authorization header (NOT cookies)
});

const dispatchAuthEvent = (name, detail) => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // ignore
  }
};

const getRequestPath = (value) => {
  const raw = String(value || "");
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      return new URL(raw).pathname || raw;
    } catch {
      return raw;
    }
  }
  return raw;
};

/**
 * ===============================
 * REQUEST INTERCEPTOR
 * - Attach JWT safely
 * ===============================
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    const url = String(config?.url || "");
    const path = getRequestPath(url);
    const isProtected =
      path.includes("/my/") ||
      path.includes("/admin/") ||
      path.includes("/auth/me") ||
      path.includes("/auth/logout");

    if (!token && isProtected) {
      dispatchAuthEvent("auth:missing", { url, path });
      const err = new Error("AUTH_MISSING");
      err.code = "AUTH_MISSING";
      err.isAuthError = true;
      throw err;
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * ===============================
 * RESPONSE INTERCEPTOR
 * - Handle auth expiration cleanly
 * ===============================
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // Token invalid / expired
    if (status === 401) {
      localStorage.removeItem("token");
      dispatchAuthEvent("auth:expired", { status });

      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
