import React, { createContext, useState, useCallback, useMemo } from "react";
import { loginUser, signupUser, loginDepartmentApi } from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u && u !== "undefined" ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const saveSession = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  const loginCitizen = useCallback(async (phone, password) => {
    const res = await loginUser({ phone, password });
    if (res.token && res.user) {
      saveSession(res.token, res.user);
      return res;
    }
    throw new Error(res.error || "Login failed");
  }, [saveSession]);

  const signupCitizen = useCallback(async (name, phone, password) => {
    const res = await signupUser({ name, phone, password });
    if (res.token && res.user) {
      saveSession(res.token, res.user);
      return res;
    }
    throw new Error(res.error || "Signup failed");
  }, [saveSession]);

  const loginDepartment = useCallback(async (department, password) => {
    const res = await loginDepartmentApi({ department, password });
    if (res.token && res.user) {
      saveSession(res.token, res.user);
      return res;
    }
    throw new Error(res.error || "Department login failed");
  }, [saveSession]);

  const isDepartmentUser = useMemo(() => {
    return user && (user.role === "department" || user.role === "admin");
  }, [user]);

  const isCitizen = useMemo(() => {
    return user && user.role === "citizen";
  }, [user]);

  const value = useMemo(() => ({
    token,
    user,
    isCitizen,
    isDepartmentUser,
    loginCitizen,
    signupCitizen,
    loginDepartment,
    logout
  }), [token, user, isCitizen, isDepartmentUser, loginCitizen, signupCitizen, loginDepartment, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
