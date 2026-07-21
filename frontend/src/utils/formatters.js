import { MEDIA_URL } from "../constants/config";

export function formatDateTime(dateStr) {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

export function resolveImageUrl(img) {
  if (!img) return null;
  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) {
    return img;
  }
  return `${MEDIA_URL}/${img}`;
}

export function getPriorityClass(priorityLevel) {
  const level = (priorityLevel || "Medium").toLowerCase();
  switch (level) {
    case "critical": return "critical";
    case "high": return "high";
    case "medium": return "medium";
    default: return "low";
  }
}

export function getStatusClass(status) {
  const s = (status || "Pending").toLowerCase().replace(/\s+/g, "");
  if (s.includes("progress")) return "in-progress";
  if (s.includes("resolve")) return "resolved";
  if (s.includes("reject")) return "rejected";
  return "pending";
}

export function getSeverityColor(severity) {
  switch (severity) {
    case "Critical": return "#dc2626"; // Red
    case "High": return "#ea580c";     // Orange
    case "Medium": return "#d97706";   // Yellow
    case "Low":
    default: return "#059669";          // Green
  }
}
