import React, { createContext, useState, useCallback, useEffect, useMemo } from "react";
import { 
  fetchComplaints, 
  fetchNearbyComplaints, 
  updateComplaintStatus, 
  supportComplaint, 
  postComment, 
  fetchComments 
} from "../services/api";

export const ComplaintsContext = createContext(null);

export function ComplaintsProvider({ children }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState("SuperAdmin");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [drawerReports, setDrawerReports] = useState([]);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchComplaints();
      setComplaints(data || []);
    } catch (err) {
      console.warn("Failed to retrieve complaints:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // Real-time status update method
  const updateStatus = useCallback(async (complaintId, newStatus, note, token) => {
    const res = await updateComplaintStatus(complaintId, newStatus, note, token);
    const updatedComp = res.complaint;

    // Immediately update global state so maps, citizen feed, and dashboards refresh instantly
    setComplaints((prev) =>
      prev.map((c) => ((c._id || c.id) === (updatedComp._id || updatedComp.id) ? updatedComp : c))
    );

    if (selectedComplaint && (selectedComplaint._id || selectedComplaint.id) === (updatedComp._id || updatedComp.id)) {
      setSelectedComplaint(updatedComp);
    }

    return res;
  }, [selectedComplaint]);

  // Real-time upvote / support method
  const upvoteComplaint = useCallback(async (complaintId, token) => {
    const res = await supportComplaint(complaintId, token);
    const updatedComp = res.complaint;

    setComplaints((prev) =>
      prev.map((c) => ((c._id || c.id) === (updatedComp._id || updatedComp.id) ? updatedComp : c))
    );

    return res;
  }, []);

  // Real-time comment post method
  const addCommentToComplaint = useCallback(async (complaintId, commentText, token) => {
    const res = await postComment(complaintId, commentText, token);
    const newComments = res.comments;

    setComplaints((prev) =>
      prev.map((c) => {
        if ((c._id || c.id) === complaintId) {
          return { ...c, comments: newComments };
        }
        return c;
      })
    );

    return res;
  }, []);

  const value = useMemo(() => ({
    complaints,
    setComplaints,
    loading,
    selectedDept,
    setSelectedDept,
    selectedComplaint,
    setSelectedComplaint,
    drawerReports,
    setDrawerReports,
    loadComplaints,
    updateStatus,
    upvoteComplaint,
    addCommentToComplaint
  }), [
    complaints,
    loading,
    selectedDept,
    selectedComplaint,
    drawerReports,
    loadComplaints,
    updateStatus,
    upvoteComplaint,
    addCommentToComplaint
  ]);

  return <ComplaintsContext.Provider value={value}>{children}</ComplaintsContext.Provider>;
}
