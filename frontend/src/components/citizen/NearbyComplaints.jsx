import React, { useState } from "react";
import { resolveImageUrl, formatDateTime } from "../../utils/formatters";
import { getCategoryPlaceholderIcon } from "../../constants/categories";
import { supportComplaint, postComment, fetchComments } from "../../services/api";

export function NearbyComplaints({ nearbyComplaints, loadingNearby, user, token, onUpdateComplaints, onImageClick }) {
  const [expandedId, setExpandedId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [supportingId, setSupportingId] = useState(null);

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      try {
        const comments = await fetchComments(id);
        setCommentsMap((prev) => ({ ...prev, [id]: comments }));
      } catch (err) {
        console.warn("Failed to load comments:", err);
      }
    }
  };

  const handleSupport = async (comp) => {
    const compId = comp._id || comp.id;
    if (!token) {
      alert("Please sign in to support and upvote civic issues.");
      return;
    }

    setSupportingId(compId);
    try {
      await supportComplaint(compId, token);
      if (onUpdateComplaints) onUpdateComplaints();
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
      const res = await postComment(compId, newCommentText, token);
      setCommentsMap((prev) => ({ ...prev, [compId]: res.comments || [] }));
      setNewCommentText("");
    } catch (err) {
      alert(err.message || "Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="glass-card nearby-section" style={{ height: "fit-content" }}>
      <h2 className="drawer-section-title" style={{ fontSize: "17px", borderLeftColor: "var(--elastic-blue)", marginBottom: "12px" }}>
        📍 Existing Reports in this Area ({nearbyComplaints.length})
      </h2>

      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: "1.4" }}>
        Complaints reported within a 1.5 km radius of your selected map pin. Upvote active issues to boost their priority score instead of filing duplicates.
      </p>

      {loadingNearby ? (
        <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>Scanning 1.5 km vicinity...</p>
      ) : nearbyComplaints.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", border: "1px dashed var(--border-glass)", borderRadius: "14px", background: "#f8fafc" }}>
          <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>🌱</span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            No active complaints within 1.5 km of this pin. Your report will map a new issue site.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {nearbyComplaints.map((comp) => {
            const compId = comp._id || comp.id;
            const isExpanded = expandedId === compId;
            const commentsList = commentsMap[compId] || comp.comments || [];
            const hasSupported = comp.reports && user && comp.reports.some((r) => r.userId && r.userId.toString() === user.id);

            return (
              <div key={compId} className="nearby-report-card" style={{ background: "#ffffff", border: "1px solid var(--border-glass)", borderRadius: "14px", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
                {/* Image / Category Placeholder Banner */}
                <div style={{ height: "130px", width: "100%", position: "relative", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {comp.images && comp.images.length > 0 ? (
                    <img
                      src={resolveImageUrl(comp.images[0])}
                      alt={comp.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: "42px" }}>{getCategoryPlaceholderIcon(comp.category)}</span>
                  )}
                  <span style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(15, 23, 42, 0.8)", color: "#ffffff", fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "12px" }}>
                    {comp.reportCount || 1} Reports
                  </span>
                </div>

                <div style={{ padding: "14px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                    {comp.title || comp.description}
                  </h4>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>
                    📍 {comp.location || "Delhi"} &bull; {comp.category}
                  </p>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      className={hasSupported ? "btn-secondary" : "btn-primary"}
                      style={{ flex: 1, padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => handleSupport(comp)}
                      disabled={supportingId === compId || hasSupported}
                    >
                      {hasSupported ? "✓ Supported" : supportingId === compId ? "Upvoting..." : "👍 Support Issue (+Weight)"}
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
                    <div style={{ marginTop: "14px", borderTop: "1px solid var(--border-glass)", paddingTop: "10px" }}>
                      <h5 style={{ fontSize: "12px", fontWeight: "700", marginBottom: "8px", color: "var(--text-secondary)" }}>Community Discussion</h5>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "160px", overflowY: "auto", marginBottom: "10px" }}>
                        {commentsList.length === 0 ? (
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>No comments yet. Be the first to join discussion.</p>
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
                          placeholder="Add comment..."
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
