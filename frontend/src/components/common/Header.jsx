import React from "react";

export function Header({ activeTab, setActiveTab, user, onLogout }) {
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
            🏢 Department Dashboard
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
            <div className="profile-avatar-sm">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <span>{user.name}</span>
            <button className="btn-signout" onClick={onLogout} title="Sign Out">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
