import React, { useState } from "react";
import { useComplaints } from "../hooks/useComplaints";
import { useAuth } from "../hooks/useAuth";
import { AnalyticsMapView } from "../components/analytics/AnalyticsMapView";
import { InspectionDrawer } from "../components/department/InspectionDrawer";
import { AnalyticsView } from "../components/analytics/AnalyticsView";

export function AnalyticsPage({ onImageClick }) {
  const { complaints, upvoteComplaint, drawerReports, openDrawer, closeDrawer, selectedComplaint, loadComplaints } = useComplaints();
  const { token } = useAuth();
  const [subTab, setSubTab] = useState("map"); // map, metrics

  const handleUpvote = async (compId) => {
    if (!token) {
      alert("Please sign in to support and upvote civic issues.");
      return;
    }
    try {
      await upvoteComplaint(compId, token);
    } catch (err) {
      alert(err.message || "Failed to upvote.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Analytics Sub-Tab Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "12px 20px", borderRadius: "16px", border: "1px solid var(--border-glass)" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
          📊 Delhi Civic Analytics Engine
        </div>
        <div className="nav-tabs" style={{ padding: "3px" }}>
          <button
            className={`tab-btn ${subTab === "map" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "12px" }}
            onClick={() => setSubTab("map")}
          >
            🗺️ Interactive Geospatial Map
          </button>
          <button
            className={`tab-btn ${subTab === "metrics" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "12px" }}
            onClick={() => setSubTab("metrics")}
          >
            📈 KPI Metrics &amp; Charts
          </button>
        </div>
      </div>

      {subTab === "map" ? (
        <AnalyticsMapView
          complaints={complaints}
          onUpvote={handleUpvote}
          onSelectComplaint={openDrawer}
          onImageClick={onImageClick}
        />
      ) : (
        <AnalyticsView complaints={complaints} />
      )}

      {/* Details Inspection Drawer */}
      {selectedComplaint && (
        <InspectionDrawer
          selectedComplaint={selectedComplaint}
          drawerReports={drawerReports}
          onClose={closeDrawer}
          onComplaintUpdated={() => {
            loadComplaints();
            closeDrawer();
          }}
          onImageClick={onImageClick}
        />
      )}
    </div>
  );
}
