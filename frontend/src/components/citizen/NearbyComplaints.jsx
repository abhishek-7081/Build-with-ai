import React, { useState } from "react";
import { resolveImageUrl, formatDateTime } from "../../utils/formatters";
import { getCategoryPlaceholderIcon } from "../../constants/categories";
import { StatusBadge, PriorityBadge, SeverityBadge } from "../common/Badge";
import { useComplaints } from "../../hooks/useComplaints";
import { useAuth } from "../../hooks/useAuth";

export function NearbyComplaints({ nearbyComplaints, loadingNearby, onImageClick }) {
  const [expandedId, setExpandedId] = useState(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [supportingId, setSupportingId] = useState(null);

  const { token, user } = useAuth();
  const { upvoteComplaint, addCommentToComplaint } = useComplaints();

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleSupport = async (comp) => {
    const compId = comp._id || comp.id;
    if (!token) {
      alert("Please sign in to support and upvote civic issues.");
      return;
    }

    setSupportingId(compId);
    try {
      await upvoteComplaint(compId, token);
    } catch (err) {
      alert(err.message || "Failed to support complaint.");
    } finally {
      setSupportingId(null);
    }
  };

  const handleAddComment = async (compId) => {
    if (!newCommentText.trim()) return;
    setSubmittingComment(true);

    try {
      await addCommentToComplaint(compId, newCommentText, token);
      setNewCommentText("");
    } catch (err) {
      alert(err.message || "Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="glass-card nearby-section" style={{ height: "fit-content" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 className="drawer-section-title" style={{ fontSize: "17px", borderLeftColor: "var(--elastic-blue)", margin: 0 }}>
          📍 Existing Reports in this Area ({nearbyComplaints.length})
        </h2>
      </div>

      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: "1.4" }}>
        Registered grievances within 1.5 km of your GPS pin. Upvote active issues to boost their priority score instead of filing duplicate reports.
      </p>

      {loadingNearby ? (
        <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>Scanning 1.5 km GPS vicinity...</p>
      ) : nearbyComplaints.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", border: "1px dashed var(--border-glass)", borderRadius: "14px", background: "#f8fafc" }}>
          <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>🌱</span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            No active complaints within 1.5 km of this pin. Your report will map a new issue site.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {nearbyComplaints.map((comp) => {
            const compId = comp._id || comp.id;
            const isExpanded = expandedId === compId;
            const commentsList = comp.comments || [];
            const hasSupported = comp.reports && user && comp.reports.some((r) => r.userId && r.userId.toString() === user.id);

            return (
              <div key={compId} className="nearby-report-card" style={{ background: "#ffffff", border: "1px solid var(--border-glass)", borderRadius: "16px", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
                {/* Image Banner */}
                <div style={{ height: "135px", width: "100%", position: "relative", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", cursor: comp.images && comp.images.length > 0 ? "pointer" : "default" }} onClick={() => {
                  if (comp.images && comp.images.length > 0 && onImageClick) {
                    onImageClick(resolveImageUrl(comp.images[0]));
                  }
                }}>
                  {comp.images && comp.images.length > 0 ? (
                    <img
                      src={resolveImageUrl(comp.images[0])}
                      alt={comp.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: "42px" }}>{getCategoryPlaceholderIcon(comp.category)}</span>
                  )}
                  <span style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(15, 23, 42, 0.85)", color: "#ffffff", fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "12px" }}>
                    👍 {comp.reportCount || 1} Votes
                  </span>
                </div>

                <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <h4 style={{ fontSize: "14.5px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                      {comp.title || comp.description}
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      📍 <strong>{comp.location || "Delhi"}</strong> &bull; {formatDateTime(comp.createdAt)}
                    </p>
                  </div>

                  <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: "1.4", margin: 0 }}>
                    "{comp.description}"
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                    <StatusBadge status={comp.status} />
                    <PriorityBadge priorityLevel={comp.priorityLevel} score={comp.priority} />
                    <SeverityBadge severity={comp.severity} />
                  </div>

                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                    🏢 <strong>Dept:</strong> {comp.department} &bull; 🏷️ <strong>Category:</strong> {comp.category}
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                    <button
                      className={hasSupported ? "btn-secondary" : "btn-primary"}
                      style={{ flex: 1, padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => handleSupport(comp)}
                      disabled={supportingId === compId || hasSupported}
                    >
                      {hasSupported ? "✓ Upvoted" : supportingId === compId ? "Upvoting..." : "👍 Upvote (+Priority)"}
                    </button>

                    <button
                      className="btn-outline"
                      style={{ padding: "6px 10px", fontSize: "12px" }}
                      onClick={() => toggleExpand(compId)}
                    >
                      💬 {commentsList.length} Comments
                    </button>
                  </div>

                  {/* Expanded Comments Thread */}
                  {isExpanded && (
                    <div style={{ marginTop: "10px", borderTop: "1px solid var(--border-glass)", paddingTop: "10px" }}>
                      <h5 style={{ fontSize: "12px", fontWeight: "700", marginBottom: "8px", color: "var(--text-secondary)" }}>
                        Discussion ({commentsList.length})
                      </h5>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "160px", overflowY: "auto", marginBottom: "10px" }}>
                        {commentsList.length === 0 ? (
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>No comments yet. Be the first to join the conversation.</p>
                        ) : (
                          commentsList.map((c, i) => (
                            <div key={i} style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: "8px", fontSize: "12px" }}>
                              <strong>{c.userName || "Citizen"}:</strong> {c.commentText}
                            </div>
                          ))
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          style={{ flex: 1, padding: "6px 10px", fontSize: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}
                        />
                        <button
                          className="btn-primary"
                          style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "8px" }}
                          onClick={() => handleAddComment(compId)}
                          disabled={submittingComment}
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
