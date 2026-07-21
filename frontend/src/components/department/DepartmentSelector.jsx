import React from "react";
import { DEPARTMENTS } from "../../constants/departments";

export function DepartmentSelector({ selectedDept, onSelectDept }) {
  return (
    <div className="department-cards-grid">
      {DEPARTMENTS.map((dept) => {
        const isSelected = selectedDept === dept.id;
        return (
          <div
            key={dept.id}
            className={`dept-card ${isSelected ? "selected" : ""}`}
            style={{ "--dept-color": dept.color }}
            onClick={() => onSelectDept(dept.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>{dept.icon}</span>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>{dept.name}</h3>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{dept.fullName}</span>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              {dept.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}
