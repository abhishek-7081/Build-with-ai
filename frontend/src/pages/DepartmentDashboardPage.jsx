import React from "react";
import { DepartmentDashboard } from "../components/department/DepartmentDashboard";

export function DepartmentDashboardPage({
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
  return (
    <DepartmentDashboard
      complaints={complaints}
      loading={loading}
      selectedDept={selectedDept}
      setSelectedDept={setSelectedDept}
      selectedComplaint={selectedComplaint}
      drawerReports={drawerReports}
      onOpenDrawer={onOpenDrawer}
      onCloseDrawer={onCloseDrawer}
      onComplaintUpdated={onComplaintUpdated}
      onImageClick={onImageClick}
    />
  );
}
