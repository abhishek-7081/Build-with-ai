import React, { useEffect, useState } from "react";
import { resolveImageUrl, getSeverityColor, getStatusClass, getPriorityClass } from "../../utils/formatters";
import { getCategoryPlaceholderIcon } from "../../constants/categories";

export function AnalyticsMapView({ complaints, onUpvote, onSelectComplaint, onImageClick }) {
  const [viewMode, setViewMode] = useState("map"); // map, heatmap
  const [activeFilter, setActiveFilter] = useState("all"); // all, Critical, High, Medium, Low

  const filteredComplaints = complaints.filter(c => {
    if (activeFilter === "all") return true;
    return c.severity === activeFilter;
  });

  // Initialize and update Leaflet Analytics Map
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!window.L) return;

      if (window.analyticsMap) {
        try {
          window.analyticsMap.remove();
        } catch (e) {
          // ignore
        }
        window.analyticsMap = null;
      }

      const container = document.getElementById("analytics-map");
      if (!container) return;

      try {
        const map = window.L.map("analytics-map").setView([28.6139, 77.2090], 11);
        window.analyticsMap = map;

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        if (viewMode === "map") {
          // Plot markers with severity colors
          filteredComplaints.forEach((comp) => {
            if (comp.locationCoords && comp.locationCoords.lat && comp.locationCoords.lng) {
              const color = getSeverityColor(comp.severity);
              const marker = window.L.circleMarker([comp.locationCoords.lat, comp.locationCoords.lng], {
                radius: comp.reportCount > 1 ? 11 : 8,
                fillColor: color,
                color: "#ffffff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
              }).addTo(map);

              const compId = comp._id || comp.id;
              const imgSrc = comp.images && comp.images.length > 0 ? resolveImageUrl(comp.images[0]) : null;

              const popupHtml = `
                <div style="font-family: 'Inter', sans-serif; width: 220px; padding: 4px;">
                  ${imgSrc ? `<img src="${imgSrc}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : ''}
                  <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                    ${comp.title || comp.description.substring(0, 30)}
                  </div>
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                    🏢 ${comp.department} &bull; 🏷️ ${comp.category}
                  </div>
                  <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
                    <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 700;">
                      ${comp.status || 'Pending'}
                    </span>
                    <span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 700;">
                      ${comp.priorityLevel || 'Medium'} (${comp.priority || 0}%)
                    </span>
                  </div>
                  <div style="font-size: 11px; color: #334155; margin-bottom: 8px;">
                    👍 ${comp.reportCount || 1} Votes &bull; 💬 ${(comp.comments && comp.comments.length) || 0} Comments
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <button 
                      style="flex: 1; background: #006bb4; color: #fff; border: none; border-radius: 6px; padding: 5px; font-size: 11px; font-weight: 600; cursor: pointer;"
                      onclick="document.dispatchEvent(new CustomEvent('analyticsUpvote', {detail: '${compId}'}))"
                    >
                      👍 Upvote
                    </button>
                    <button 
                      style="flex: 1; background: #f1f5f9; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px; font-size: 11px; font-weight: 600; cursor: pointer;"
                      onclick="document.dispatchEvent(new CustomEvent('analyticsDetails', {detail: '${compId}'}))"
                    >
                      Details ➔
                    </button>
                  </div>
                </div>
              `;

              marker.bindPopup(popupHtml);
            }
          });
        } else if (viewMode === "heatmap") {
          // Heatmap circle overlay representation
          filteredComplaints.forEach((comp) => {
            if (comp.locationCoords && comp.locationCoords.lat && comp.locationCoords.lng) {
              const color = getSeverityColor(comp.severity);
              window.L.circle([comp.locationCoords.lat, comp.locationCoords.lng], {
                radius: 400 + (comp.reportCount * 100),
                fillColor: color,
                color: color,
                weight: 1,
                opacity: 0.4,
                fillOpacity: 0.35
              }).addTo(map);
            }
          });
        }
      } catch (err) {
        console.error("Analytics map error:", err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [viewMode, activeFilter, complaints, filteredComplaints]);

  // Handle custom popup button events
  useEffect(() => {
    const handleUpvoteEvent = (e) => {
      const compId = e.detail;
      if (onUpvote) onUpvote(compId);
    };

    const handleDetailsEvent = (e) => {
      const compId = e.detail;
      const matched = complaints.find(c => (c._id || c.id) === compId);
      if (matched && onSelectComplaint) onSelectComplaint(matched);
    };

    document.addEventListener("analyticsUpvote", handleUpvoteEvent);
    document.addEventListener("analyticsDetails", handleDetailsEvent);

    return () => {
      document.removeEventListener("analyticsUpvote", handleUpvoteEvent);
      document.removeEventListener("analyticsDetails", handleDetailsEvent);
    };
  }, [complaints, onUpvote, onSelectComplaint]);

  return (
    <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Map Control Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontFamily: "var(--font-display)", fontWeight: "800", color: "var(--text-primary)" }}>
            🗺️ Live Interactive Analytics &amp; Incident Heatmap
          </h2>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Real-time geospatial visualization of Delhi municipal grievances ({filteredComplaints.length} plotted)
          </span>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Mode Switcher */}
          <div style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "10px", border: "1px solid var(--border-glass)" }}>
            <button
              className={`tab-btn ${viewMode === "map" ? "active" : ""}`}
              style={{ padding: "5px 12px", fontSize: "12px" }}
              onClick={() => setViewMode("map")}
            >
              📍 Marker Map
            </button>
            <button
              className={`tab-btn ${viewMode === "heatmap" ? "active" : ""}`}
              style={{ padding: "5px 12px", fontSize: "12px" }}
              onClick={() => setViewMode("heatmap")}
            >
              🔥 Density Heatmap
            </button>
          </div>

          {/* Severity Filters */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "10px" }}
          >
            <option value="all">All Severities</option>
            <option value="Critical">🔴 Critical</option>
            <option value="High">🟠 High</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Low">🟢 Low</option>
          </select>
        </div>
      </div>

      {/* Map Legend */}
      <div style={{ display: "flex", gap: "16px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", flexWrap: "wrap", padding: "8px 12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid var(--border-glass)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#059669" }}></span> Low Severity
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#d97706" }}></span> Medium Severity
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ea580c" }}></span> High Severity
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#dc2626" }}></span> Critical Severity
        </span>
      </div>

      {/* Map Container */}
      <div id="analytics-map" style={{ height: "550px", width: "100%", borderRadius: "16px", overflow: "hidden", border: "1px solid var(--border-glass)" }}></div>
    </div>
  );
}
