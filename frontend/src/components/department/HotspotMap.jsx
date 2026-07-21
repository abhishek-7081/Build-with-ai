import React, { useEffect } from "react";

export function HotspotMap({ complaints, onSelectComplaint }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!window.L) return;

      if (window.dashboardMap) {
        try {
          window.dashboardMap.remove();
        } catch (e) {
          console.warn("Error removing dashboard map:", e);
        }
        window.dashboardMap = null;
      }

      const mapContainer = document.getElementById("dashboard-map");
      if (!mapContainer) return;

      try {
        const map = window.L.map("dashboard-map").setView([28.6139, 77.2090], 11);
        window.dashboardMap = map;

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        complaints.forEach((comp) => {
          if (comp.locationCoords && comp.locationCoords.lat && comp.locationCoords.lng) {
            const isMergedHotspot = comp.reportCount > 1;
            const markerColor =
              comp.priorityLevel === "Critical" ? "#dc2626" :
              comp.priorityLevel === "High" ? "#ea580c" :
              comp.priorityLevel === "Medium" ? "#d97706" : "#059669";

            const marker = window.L.circleMarker([comp.locationCoords.lat, comp.locationCoords.lng], {
              radius: isMergedHotspot ? 10 : 7,
              fillColor: isMergedHotspot ? "#db2777" : markerColor,
              color: "#ffffff",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.95
            }).addTo(map);

            const compId = comp._id || comp.id;

            marker.bindPopup(`
              <div style="font-family: 'Inter', sans-serif; font-size: 12px; padding: 4px;">
                <strong style="font-size: 13px;">${comp.title || comp.description}</strong><br/>
                <span style="color: #64748b;">Dept: ${comp.department}</span><br/>
                <span style="color: #006bb4; font-weight: 600;">Priority: ${comp.priorityLevel} (${comp.priority}%)</span><br/>
                <span>Consolidated Submissions: ${comp.reportCount}</span><br/>
                <button 
                  style="background: #006bb4; color: #fff; border: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 600; margin-top: 8px; width: 100%; cursor: pointer;"
                  onclick="document.dispatchEvent(new CustomEvent('selectComplaint', {detail: '${compId}'}))"
                >
                  🔍 Inspect Details
                </button>
              </div>
            `);
          }
        });
      } catch (err) {
        console.error("Hotspot Leaflet map creation error:", err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [complaints]);

  useEffect(() => {
    const handleCustomSelect = (e) => {
      const targetId = e.detail;
      const matched = complaints.find((c) => (c._id || c.id) === targetId);
      if (matched && onSelectComplaint) {
        onSelectComplaint(matched);
      }
    };

    document.addEventListener("selectComplaint", handleCustomSelect);
    return () => document.removeEventListener("selectComplaint", handleCustomSelect);
  }, [complaints, onSelectComplaint]);

  return (
    <div className="glass-card" style={{ marginBottom: "24px", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ fontSize: "16px", fontFamily: "var(--font-display)", fontWeight: "700" }}>
          📍 Delhi Municipal Hotspots &amp; Incident Master Map
        </h3>
        <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: "600" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#db2777" }}></span> Merged Hotspot
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#dc2626" }}></span> Critical Priority
          </span>
        </div>
      </div>
      <div id="dashboard-map" className="hotspot-map"></div>
    </div>
  );
}
