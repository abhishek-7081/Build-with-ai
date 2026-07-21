import { useState, useCallback, useEffect } from "react";
import { fetchComplaints, fetchComplaintReports } from "../services/api";

export function useComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDept, setSelectedDept] = useState("SuperAdmin");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [drawerReports, setDrawerReports] = useState([]);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await fetchComplaints();
      setComplaints(data);
    } catch (err) {
      setErrorMessage(err.message || "Failed to retrieve complaints");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const openDrawer = useCallback(async (complaint) => {
    setSelectedComplaint(complaint);
    setDrawerReports([]);
    try {
      const compId = complaint._id || complaint.id;
      const reports = await fetchComplaintReports(compId);
      setDrawerReports(reports);
    } catch (err) {
      console.warn("Failed to load nested reports for drawer:", err);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setSelectedComplaint(null);
    setDrawerReports([]);
  }, []);

  return {
    complaints,
    setComplaints,
    loading,
    errorMessage,
    selectedDept,
    setSelectedDept,
    selectedComplaint,
    setSelectedComplaint,
    drawerReports,
    loadComplaints,
    openDrawer,
    closeDrawer
  };
}
