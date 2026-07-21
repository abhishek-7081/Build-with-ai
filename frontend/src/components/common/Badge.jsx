import React from "react";
import { getPriorityClass, getStatusClass } from "../../utils/formatters";

export function StatusBadge({ status }) {
  const cls = getStatusClass(status);
  let icon = "⏳";
  if (cls === "in-progress") icon = "🔄";
  if (cls === "resolved") icon = "✅";

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
