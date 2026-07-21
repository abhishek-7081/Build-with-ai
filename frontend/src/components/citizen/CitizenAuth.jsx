import React from "react";

export function CitizenAuth({
  authMode,
  setAuthMode,
  authName,
  setAuthName,
  authPhone,
  setAuthPhone,
  authPassword,
  setAuthPassword,
  authError,
  authLoading,
  onLogin,
  onSignup
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (authMode === "login") {
      onLogin(authPhone, authPassword);
    } else {
      onSignup(authName, authPhone, authPassword);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-card">
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab ${authMode === "login" ? "active" : ""}`}
            onClick={() => setAuthMode("login")}
          >
            Citizen Sign In
          </button>
          <button 
            type="button"
            className={`auth-tab ${authMode === "signup" ? "active" : ""}`}
            onClick={() => setAuthMode("signup")}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {authMode === "signup" && (
            <div className="form-group" style={{ margin: 0 }}>
              <label>Full Name</label>
              <input 
                type="text" 
                placeholder="e.g. Amit Sharma"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label>Phone Number (Registered unique ID)</label>
            <input 
              type="tel" 
              placeholder="e.g. 9810123456"
              value={authPhone}
              onChange={(e) => setAuthPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Password</label>
            <input 
              type="password" 
              placeholder="Enter secure password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
            />
          </div>

          {authError && (
            <p style={{ color: "var(--metro-red)", fontSize: "13px", margin: 0 }}>
              ⚠️ {authError}
            </p>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: "8px" }} disabled={authLoading}>
            {authLoading ? "Verifying Credentials..." : authMode === "login" ? "Sign In" : "Register Account"}
          </button>
        </form>

        <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", marginTop: "24px" }}>
          Demo Credentials — Phone: <strong style={{ color: "var(--elastic-blue)" }}>9810123456</strong>, Password: <strong style={{ color: "var(--elastic-blue)" }}>password123</strong>
        </p>
      </div>
    </div>
  );
}
