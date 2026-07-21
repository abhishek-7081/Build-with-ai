import React from "react";
import { useAuth } from "../../hooks/useAuth";

export function Header({ activeTab, setActiveTab }) {
  const { user, isDepartmentUser, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo-container">
          🏛️
        </div>
        <div className="brand-title-group">
          <h1>Delhi Civic Hub</h1>
          <p>Intelligent Routing &amp; Hotspot Management</p>
        </div>
      </div>

      <div className="header-actions">
        <nav className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === "portal" ? "active" : ""}`}
            onClick={() => setActiveTab("portal")}
          >
            📢 Citizen Portal
          </button>
          <button 
            className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            🏢 Department Dashboard {isDepartmentUser ? "✓" : "🔒"}
          </button>
          <button 
            className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            📊 Live Analytics
          </button>
        </nav>

        {user && (
          <div className="user-profile-pill">
            <div className="profile-avatar-sm" style={{ background: isDepartmentUser ? "linear-gradient(135deg, #6366f1, #006bb4)" : undefined }}>
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700" }}>{user.name}</span>
              <span style={{ fontSize: "10px", color: isDepartmentUser ? "var(--elastic-blue)" : "var(--text-muted)", fontWeight: "600" }}>
                {isDepartmentUser ? `🏢 ${user.department || "Admin"}` : "👤 Citizen Account"}
              </span>
            </div>
            <button className="btn-signout" onClick={logout} title="Sign Out">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
