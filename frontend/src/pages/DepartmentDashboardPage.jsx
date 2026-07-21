import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useComplaints } from "../hooks/useComplaints";
import { DepartmentAuth } from "../components/department/DepartmentAuth";
import { DepartmentDashboard } from "../components/department/DepartmentDashboard";

export function DepartmentDashboardPage({ onImageClick }) {
  const { isDepartmentUser, loginDepartment } = useAuth();
  const complaintsState = useComplaints();

  if (!isDepartmentUser) {
    return <DepartmentAuth onLogin={loginDepartment} />;
  }

  return (
    <DepartmentDashboard
      complaints={complaintsState.complaints}
      loading={complaintsState.loading}
      selectedDept={complaintsState.selectedDept}
      setSelectedDept={complaintsState.setSelectedDept}
      selectedComplaint={complaintsState.selectedComplaint}
      drawerReports={complaintsState.drawerReports}
      onOpenDrawer={complaintsState.openDrawer}
      onCloseDrawer={complaintsState.closeDrawer}
      onComplaintUpdated={() => {
        complaintsState.loadComplaints();
        complaintsState.closeDrawer();
      }}
      onImageClick={onImageClick}
    />
  );
}
