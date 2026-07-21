import React from "react";
import { StatusBadge, PriorityBadge } from "../common/Badge";
import { resolveImageUrl, formatDateTime } from "../../utils/formatters";

export function MyComplaintsList({ myComplaints, loading, onImageClick }) {
  if (loading) {
    return (
      <div className="glass-card" style={{ textAlign: "center", padding: "40px" }}>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading your reported complaints...</p>
      </div>
    );
  }

  if (myComplaints.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: "center", padding: "40px" }}>
        <span style={{ fontSize: "36px", display: "block", marginBottom: "12px" }}>📂</span>
        <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>No Reported Issues Yet</h3>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          You haven't submitted any civic complaints from this account yet. Use the "Report Civic Issue" tab to log a problem.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {myComplaints.map((comp) => {
        const compId = comp._id || comp.id;
        return (
          <div key={compId} className="complaint-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
                  {comp.title || comp.description.substring(0, 45) + "..."}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  📍 {comp.location || "Delhi Zone"} &bull; {formatDateTime(comp.createdAt)}
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <StatusBadge status={comp.status} />
                <PriorityBadge priorityLevel={comp.priorityLevel} score={comp.priority} />
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              "{comp.description}"
            </p>

            <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-muted)", flexWrap: "wrap" }}>
              <span>🏢 <strong>Dept:</strong> {comp.department}</span>
              <span>🏷️ <strong>Category:</strong> {comp.category}</span>
              <span>👥 <strong>Reports Consolidated:</strong> {comp.reportCount}</span>
            </div>

            {/* Photos Uploaded */}
            {comp.images && comp.images.length > 0 && (
              <div className="photo-gallery" style={{ marginTop: "4px" }}>
                {comp.images.map((img, i) => {
                  const src = resolveImageUrl(img);
                  return (
                    <div key={i} className="gallery-photo-wrapper" onClick={() => onImageClick(src)}>
                      <img src={src} className="gallery-photo" alt="Evidence" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Status History Timeline */}
            {comp.history && comp.history.length > 0 && (
              <div style={{ marginTop: "8px", borderTop: "1px dashed var(--border-glass)", paddingTop: "12px" }}>
                <h4 style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase" }}>
                  Audit Trail &amp; Status Logs
                </h4>
                <div className="history-timeline">
                  {comp.history.map((log, idx) => (
                    <div key={idx} className="history-item">
                      <div className="history-time">{formatDateTime(log.timestamp)}</div>
                      <div className="history-desc">
                        <strong>{log.status}:</strong> {log.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
