import React, { useState, useEffect } from "react";
import { StatusBadge, PriorityBadge } from "../common/Badge";
import { resolveImageUrl, formatDateTime } from "../../utils/formatters";
import { updateComplaintStatus } from "../../services/api";

export function InspectionDrawer({ selectedComplaint, drawerReports, onClose, onComplaintUpdated, onImageClick }) {
  const [status, setStatus] = useState("Pending");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (selectedComplaint) {
      setStatus(selectedComplaint.status || "Pending");
      setNote("");
    }
  }, [selectedComplaint]);

  // Mini Leaflet Map inside drawer
  useEffect(() => {
    if (!selectedComplaint || !selectedComplaint.locationCoords) return;

    const timer = setTimeout(() => {
      if (!window.L) return;

      if (window.drawerMap) {
        try {
          window.drawerMap.remove();
        } catch (e) {
          // ignore
        }
        window.drawerMap = null;
      }

      const container = document.getElementById("drawer-map");
      if (!container) return;

      try {
        const coords = selectedComplaint.locationCoords;
        const map = window.L.map("drawer-map").setView([coords.lat, coords.lng], 14);
        window.drawerMap = map;

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        window.L.marker([coords.lat, coords.lng]).addTo(map);
      } catch (err) {
        console.error("Drawer mini map error:", err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedComplaint]);

  if (!selectedComplaint) return null;

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const compId = selectedComplaint._id || selectedComplaint.id;
      const res = await updateComplaintStatus(compId, status, note);
      if (onComplaintUpdated) {
        onComplaintUpdated(res.complaint);
      }
    } catch (err) {
      alert(err.message || "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3 style={{ fontSize: "18px", fontFamily: "var(--font-display)", fontWeight: "800" }}>
              Inspection Drawer
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              ID: {selectedComplaint._id || selectedComplaint.id}
            </span>
          </div>

          <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "14px" }} onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
            {selectedComplaint.title || selectedComplaint.description}
          </h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <StatusBadge status={selectedComplaint.status} />
            <PriorityBadge priorityLevel={selectedComplaint.priorityLevel} score={selectedComplaint.priority} />
          </div>
        </div>

        {/* Location Mini Map */}
        {selectedComplaint.locationCoords && (
          <div>
            <h4 className="drawer-section-title">Location Coordinates</h4>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              📍 <strong>{selectedComplaint.location || "Delhi"}</strong> ({selectedComplaint.locationCoords.lat}, {selectedComplaint.locationCoords.lng})
            </div>
            <div id="drawer-map" className="drawer-mini-map"></div>
          </div>
        )}

        {/* AI Structured Summary */}
        <div>
          <h4 className="drawer-section-title">AI Processing Summary</h4>
          <div className="ai-report-box">
            <div className="ai-report-meta">
              <div className="ai-meta-item">
                <span className="ai-meta-label">Category</span>
                <span className="ai-meta-val" style={{ color: "var(--elastic-blue)" }}>{selectedComplaint.category}</span>
              </div>
              <div className="ai-meta-item">
                <span className="ai-meta-label">Assigned Router</span>
                <span className="ai-meta-val">{selectedComplaint.department}</span>
              </div>
              <div className="ai-meta-item">
                <span className="ai-meta-label">Severity level</span>
                <span className="ai-meta-val">{selectedComplaint.severity}</span>
              </div>
              <div className="ai-meta-item">
                <span className="ai-meta-label">Total Submissions</span>
                <span className="ai-meta-val">{selectedComplaint.reportCount}</span>
              </div>
            </div>
            <div className="ai-summary-text">
              "{selectedComplaint.summary || selectedComplaint.description}"
            </div>
          </div>
        </div>

        {/* Evidence Photos */}
        {selectedComplaint.images && selectedComplaint.images.length > 0 && (
          <div>
            <h4 className="drawer-section-title">Supporting Evidence ({selectedComplaint.images.length})</h4>
            <div className="photo-gallery">
              {selectedComplaint.images.map((img, i) => {
                const src = resolveImageUrl(img);
                return (
                  <div key={i} className="gallery-photo-wrapper" onClick={() => onImageClick(src)}>
                    <img src={src} className="gallery-photo" alt="Evidence" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Consolidated Reports Feed */}
        <div>
          <h4 className="drawer-section-title">Consolidated Citizen Reports ({drawerReports.length || selectedComplaint.reportCount})</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {drawerReports.length === 0 ? (
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", fontSize: "12px" }}>
                <strong>Reported Issue:</strong> {selectedComplaint.description}
              </div>
            ) : (
              drawerReports.map((rep, idx) => (
                <div key={idx} style={{ background: "#f8fafc", border: "1px solid var(--border-glass)", padding: "12px", borderRadius: "10px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", marginBottom: "4px" }}>
                    <span>👤 {rep.userName || "Anonymous"} ({rep.userPhone || "Not provided"})</span>
                    <span>{formatDateTime(rep.createdAt)}</span>
                  </div>
                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>{rep.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timeline Log */}
        <div>
          <h4 className="drawer-section-title">Action Audit Timeline</h4>
          <div className="history-timeline">
            {selectedComplaint.history && selectedComplaint.history.map((log, i) => (
              <div key={i} className="history-item">
                <div className="history-time">{formatDateTime(log.timestamp)}</div>
                <div className="history-desc">
                  <strong>{log.status}:</strong> {log.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Administrative Update Status Form */}
        <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "16px" }}>
          <h4 className="drawer-section-title">Update Status Action</h4>
          <form onSubmit={handleStatusSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Select Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Resolution Note / Audit Remark</label>
              <input
                type="text"
                placeholder="e.g. MCD Repair Crew dispatched to site"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={updating}>
              {updating ? "Saving Status..." : "Update Complaint Status"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
