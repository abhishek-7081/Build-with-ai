import { useState, useCallback } from "react";
import { loginUser, signupUser } from "../services/api";

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u && u !== "undefined" ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState("login"); // login, signup
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const login = useCallback(async (phone, password) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await loginUser({ phone, password });
      if (res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        return { success: true };
      }
      throw new Error("Invalid login response");
    } catch (err) {
      setAuthError(err.message || "Login failed");
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signup = useCallback(async (name, phone, password) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await signupUser({ name, phone, password });
      if (res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        return { success: true };
      }
      throw new Error("Invalid signup response");
    } catch (err) {
      setAuthError(err.message || "Signup failed");
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  return {
    token,
    user,
    authMode,
    setAuthMode,
    authName,
    setAuthName,
    authPhone,
    setAuthPhone,
    authPassword,
    setAuthPassword,
    authError,
    setAuthError,
    authLoading,
    login,
    signup,
    logout
  };
}
