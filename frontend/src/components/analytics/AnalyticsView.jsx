import React from "react";
import { CATEGORIES } from "../../constants/categories";

export function AnalyticsView({ complaints }) {
  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "Pending").length;
  const progress = complaints.filter((c) => c.status === "In Progress").length;
  const resolved = complaints.filter((c) => c.status === "Resolved").length;
  const totalDuplicates = complaints.reduce((sum, c) => sum + Math.max(0, (c.reportCount || 1) - 1), 0);
  const avgPriority = total > 0 ? Math.round(complaints.reduce((sum, c) => sum + (c.priority || 0), 0) / total) : 0;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Category counts
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = complaints.filter((c) => c.category === cat).length;
    return acc;
  }, {});

  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-title">Total Issues Tracked</span>
          <span className="kpi-value">{total}</span>
          <span className="kpi-subtext">Across all 10 Delhi civic departments</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Pending Action</span>
          <span className="kpi-value" style={{ color: "var(--status-pending)" }}>{pending}</span>
          <span className="kpi-subtext">Awaiting department crew assignment</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">In Progress</span>
          <span className="kpi-value" style={{ color: "var(--status-inprogress)" }}>{progress}</span>
          <span className="kpi-subtext">Active field repairs ongoing</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Resolved Rate</span>
          <span className="kpi-value" style={{ color: "var(--status-resolved)" }}>{resolutionRate}%</span>
          <span className="kpi-subtext">{resolved} of {total} grievances resolved</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Duplicates Shielded</span>
          <span className="kpi-value" style={{ color: "var(--metro-magenta)" }}>{totalDuplicates}</span>
          <span className="kpi-subtext">Consolidated into single priority complaints</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Avg Priority Score</span>
          <span className="kpi-value" style={{ color: "var(--elastic-blue)" }}>{avgPriority}%</span>
          <span className="kpi-subtext">Dynamic severity + hotspot proximity score</span>
        </div>
      </div>

      {/* Category Breakdown Bar Chart */}
      <div className="glass-card">
        <h3 style={{ fontSize: "18px", fontFamily: "var(--font-display)", fontWeight: "800", marginBottom: "16px" }}>
          📊 Category Incident Distribution Chart
        </h3>

        <div className="chart-container">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const pct = Math.round((count / maxCategoryCount) * 100);

            return (
              <div key={cat} className="chart-bar-group">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600" }}>
                  <span>{cat}</span>
                  <span style={{ color: "var(--elastic-blue)" }}>{count} complaints</span>
                </div>
                <div style={{ background: "#f1f5f9", borderRadius: "5px", height: "10px", width: "100%" }}>
                  <div
                    className="chart-bar-fill"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
