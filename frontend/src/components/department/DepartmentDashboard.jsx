import React, { useState, useMemo } from "react";
import { DepartmentSelector } from "./DepartmentSelector";
import { HotspotMap } from "./HotspotMap";
import { InspectionDrawer } from "./InspectionDrawer";
import { StatusBadge, PriorityBadge } from "../common/Badge";
import { CATEGORIES } from "../../constants/categories";
import { formatDateTime, resolveImageUrl } from "../../utils/formatters";

export function DepartmentDashboard({
  complaints,
  loading,
  selectedDept,
  setSelectedDept,
  selectedComplaint,
  drawerReports,
  onOpenDrawer,
  onCloseDrawer,
  onComplaintUpdated,
  onImageClick
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filteredComplaints = useMemo(() => {
    return complaints.filter((comp) => {
      // Dept filter
      if (selectedDept !== "SuperAdmin" && comp.department !== selectedDept) {
        if (selectedDept === "Traffic" && comp.department !== "Delhi Traffic Police") return false;
        if (selectedDept === "Electricity" && !comp.department.includes("DISCOM")) return false;
        if (selectedDept !== "Traffic" && selectedDept !== "Electricity" && comp.department !== selectedDept) return false;
      }

      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (comp.title || "").toLowerCase().includes(q);
        const descMatch = (comp.description || "").toLowerCase().includes(q);
        const locMatch = (comp.location || "").toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !locMatch) return false;
      }

      // Category filter
      if (filterCategory && comp.category !== filterCategory) return false;

      // Priority filter
      if (filterPriority && comp.priorityLevel !== filterPriority) return false;

      // Status filter
      if (filterStatus && comp.status !== filterStatus) return false;

      return true;
    });
  }, [complaints, selectedDept, searchQuery, filterCategory, filterPriority, filterStatus]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Department Selector Cards */}
      <DepartmentSelector selectedDept={selectedDept} onSelectDept={setSelectedDept} />

      {/* Hotspot Incident Master Map */}
      <HotspotMap complaints={filteredComplaints} onSelectComplaint={onOpenDrawer} />

      {/* Filter and Master Complaints View */}
      <div className="glass-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontFamily: "var(--font-display)", fontWeight: "800", color: "var(--text-primary)" }}>
              🏛️ Department Action Portal ({filteredComplaints.length} Issues)
            </h2>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Filtered by: {selectedDept} Gateway
            </span>
          </div>

          {/* Search bar & filter controls */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="🔍 Search title, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "200px", padding: "8px 12px", fontSize: "13px", borderRadius: "10px" }}
            />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: "8px 12px", fontSize: "13px", borderRadius: "10px" }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{ padding: "8px 12px", fontSize: "13px", borderRadius: "10px" }}
            >
              <option value="">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "8px 12px", fontSize: "13px", borderRadius: "10px" }}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Complaints Grid */}
        {loading ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading department complaints...</p>
        ) : filteredComplaints.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", background: "#f8fafc", borderRadius: "12px" }}>
            No complaints match the current filter selection.
          </div>
        ) : (
          <div className="complaints-grid">
            {filteredComplaints.map((comp) => {
              const compId = comp._id || comp.id;
              return (
                <div key={compId} className="complaint-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "12px", color: "var(--elastic-blue)", fontWeight: "700" }}>
                      {comp.category}
                    </span>
                    <StatusBadge status={comp.status} />
                  </div>

                  <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {comp.title || comp.description.substring(0, 40) + "..."}
                  </h3>

                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", height: "38px", overflow: "hidden" }}>
                    "{comp.description}"
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                    <span>📍 {comp.location || "Delhi"}</span>
                    <span>👥 {comp.reportCount} reports</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <PriorityBadge priorityLevel={comp.priorityLevel} score={comp.priority} />
                    <button
                      className="btn-primary"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => onOpenDrawer(comp)}
                    >
                      Inspect Issue ➔
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-out Inspection Drawer */}
      {selectedComplaint && (
        <InspectionDrawer
          selectedComplaint={selectedComplaint}
          drawerReports={drawerReports}
          onClose={onCloseDrawer}
          onComplaintUpdated={onComplaintUpdated}
          onImageClick={onImageClick}
        />
      )}
    </div>
  );
}
