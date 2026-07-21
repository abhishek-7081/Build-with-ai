import React from "react";
import { getPriorityClass, getStatusClass, getSeverityColor } from "../../utils/formatters";

export function StatusBadge({ status }) {
  const cls = getStatusClass(status);
  let icon = "⏳";
  if (cls === "in-progress") icon = "🔄";
  if (cls === "resolved") icon = "✅";
  if (cls === "rejected") icon = "❌";

  return (
    <span className={`badge-status ${cls}`}>
      <span>{icon}</span> {status || "Pending"}
    </span>
  );
}

export function PriorityBadge({ priorityLevel, score }) {
  const cls = getPriorityClass(priorityLevel);
  return (
    <span className={`badge-priority ${cls}`}>
      🔥 {priorityLevel || "Medium"} {score !== undefined ? `(${score}%)` : ""}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const color = getSeverityColor(severity);
  return (
    <span style={{
      background: `${color}15`,
      color: color,
      border: `1px solid ${color}40`,
      padding: "3px 8px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: "700",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px"
    }}>
      ● {severity || "Low"}
    </span>
  );
}
