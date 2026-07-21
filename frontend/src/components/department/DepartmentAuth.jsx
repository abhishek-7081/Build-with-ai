import React, { useState } from "react";
import { DEPARTMENTS } from "../../constants/departments";

export function DepartmentAuth({ onLogin }) {
  const [selectedDept, setSelectedDept] = useState("MCD");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      await onLogin(selectedDept, password);
    } catch (err) {
      setErrorMsg(err.message || "Department authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-card" style={{ maxWidth: "460px" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>🏢</div>
          <h2 style={{ fontSize: "20px", fontFamily: "var(--font-display)", fontWeight: "800", color: "var(--text-primary)" }}>
            Department Official Portal Access
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Restricted gateway for MCD, PWD, DJB, Traffic, DISCOM, and Admin personnel.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Select Department Gateway *</label>
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.icon} {dept.name} ({dept.fullName})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Access Password *</label>
            <input
              type="password"
              placeholder="Enter official access password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMsg && (
            <p style={{ color: "var(--metro-red)", fontSize: "13px", margin: 0 }}>
              ⚠️ {errorMsg}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "6px" }}>
            {loading ? "Authenticating Gateway..." : "🔓 Unlock Department Dashboard"}
          </button>
        </form>

        <div style={{ marginTop: "24px", padding: "12px", background: "#f8fafc", borderRadius: "12px", border: "1px solid var(--border-glass)", fontSize: "12px", textAlign: "center" }}>
          <span style={{ fontWeight: "700", color: "var(--elastic-blue)" }}>Dev Testing Note:</span> Every department account password is set to <strong style={{ color: "var(--metro-red)" }}>123456</strong>
        </div>
      </div>
    </div>
  );
}
