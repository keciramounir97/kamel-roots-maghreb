/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "../../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeEmail = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
      return res.data;
    } catch {
      localStorage.removeItem("token");
      setUser(null);
      return null;
    }
  }, []);

  /* LOAD SESSION */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    refreshMe().finally(() => setLoading(false));
  }, [refreshMe]);

  useEffect(() => {
    const onAuthExpired = () => {
      localStorage.removeItem("token");
      setUser(null);
      setLoading(false);
    };

    const onAuthMissing = () => {
      setUser(null);
      setLoading(false);
    };

    window.addEventListener("auth:expired", onAuthExpired);
    window.addEventListener("auth:missing", onAuthMissing);
    return () => {
      window.removeEventListener("auth:expired", onAuthExpired);
      window.removeEventListener("auth:missing", onAuthMissing);
    };
  }, []);

  /* SIGNUP */
  const signup = (fullName, phone, email, password) =>
    api.post("/auth/signup", {
      fullName: fullName?.trim(),
      phone: phone?.trim(),
      email: normalizeEmail(email),
      password,
    });

  /* LOGIN */
  const login = async (email, password) => {
    const res = await api.post("/auth/login", {
      email: normalizeEmail(email),
      password,
    });
    console.log("AuthContext login response:", res.data); // Debugging
    localStorage.setItem("token", res.data.token);

    // ✅ Immediately sync user
    setUser(res.data.user);

    return res.data.user;
  };

  /* PASSWORD RESET */
  const requestReset = (email) =>
    api.post("/auth/reset", { email: normalizeEmail(email) });

  const verifyReset = (email, code, newPassword) =>
    api.post("/auth/reset/verify", {
      email: normalizeEmail(email),
      code: String(code || "").trim(),
      newPassword,
    });

  /* LOGOUT */
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        login,
        requestReset,
        verifyReset,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
