import React, { useState, useEffect, useRef } from "react";

const API_URL = "http://localhost:5000/api";
const MEDIA_URL = "http://localhost:5000/uploads";

const CATEGORIES = [
  "Road Damage",
  "Garbage Collection",
  "Water Supply",
  "Water Leakage",
  "Sewage Problems",
  "Street Lights",
  "Electricity",
  "Public Transport",
  "Traffic Signals",
  "Illegal Parking",
  "Encroachment",
  "Air Pollution",
  "Tree Fallen",
  "Drainage",
  "Public Toilets",
  "Others"
];

function App() {
  const [activeTab, setActiveTab] = useState("portal"); // portal, dashboard, analytics
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Citizen Portal State
  const [description, setDescription] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [locationOverride, setLocationOverride] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Tracking State
  const [trackingId, setTrackingId] = useState("");
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  // Dashboard State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [drawerReports, setDrawerReports] = useState([]);
  const [statusNote, setStatusNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  
  // Dashboard Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Modal Image Preview State
  const [modalImage, setModalImage] = useState(null);

  const fileInputRef = useRef(null);

  // Load complaints initially
  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/complaints`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data);
      } else {
        setErrorMessage("Failed to fetch complaints from server.");
      }
    } catch (err) {
      setErrorMessage("Could not connect to the backend server. Make sure it is running.");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic AI feedback as the user types descriptions (debounce to avoid spamming)
  useEffect(() => {
    if (description.trim().length < 15) {
      setAiSuggestion(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/analyze-test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description })
        });
        if (res.ok) {
          const data = await res.json();
          setAiSuggestion(data);
        }
      } catch (err) {
        // Silent error for typing analyzer
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [description]);

  // Fetch reports when selected complaint in dashboard changes
  useEffect(() => {
    if (selectedComplaint) {
      fetchComplaintReports(selectedComplaint.id);
      setSelectedStatus(selectedComplaint.status);
    }
  }, [selectedComplaint]);

  const fetchComplaintReports = async (id) => {
    try {
      const res = await fetch(`${API_URL}/complaints/${id}/reports`);
      if (res.ok) {
        const data = await res.json();
        setDrawerReports(data);
      }
    } catch (err) {
      console.error("Failed to load linked reports.", err);
    }
  };

  // Handle image upload input
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input dialog
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Reset form
  const resetForm = () => {
    setDescription("");
    setUserName("");
    setUserPhone("");
    setLocationOverride("");
    setImageFile(null);
    setImagePreview(null);
    setAiSuggestion(null);
    setSubmitResult(null);
  };

  // Submit Complaint Form
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setErrorMessage("");
    setSubmitResult(null);

    const formData = new FormData();
    formData.append("description", description);
    formData.append("userName", userName);
    formData.append("userPhone", userPhone);
    formData.append("locationOverride", locationOverride);
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const res = await fetch(`${API_URL}/complaints`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitResult(data);
        fetchComplaints(); // Refresh dashboard list
      } else {
        setErrorMessage(data.error || "Submission failed. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Network error: Could not submit complaint to backend.");
    } finally {
      setSubmitting(false);
    }
  };

  // Track Complaint by ID
  const handleTrackComplaint = async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    setTrackingLoading(true);
    setTrackingError("");
    setTrackedComplaint(null);

    try {
      const matched = complaints.find(c => c.id === trackingId.trim());
      if (matched) {
        // Fetch full logs and reports
        const res = await fetch(`${API_URL}/complaints/${matched.id}/reports`);
        if (res.ok) {
          const reports = await res.json();
          setTrackedComplaint({ ...matched, reports });
        } else {
          setTrackedComplaint(matched);
        }
      } else {
        setTrackingError("No complaint found with this reference ID.");
      }
    } catch (err) {
      setTrackingError("Error fetching status.");
    } finally {
      setTrackingLoading(false);
    }
  };

  // Update Status in drawer
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_URL}/complaints/${selectedComplaint.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus, note: statusNote })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Update local state
        setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? data.complaint : c));
        setSelectedComplaint(data.complaint);
        setStatusNote("");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filter complaints list
  const filteredComplaints = complaints.filter(comp => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      comp.id.toLowerCase().includes(searchLower) ||
      comp.title.toLowerCase().includes(searchLower) ||
      comp.description.toLowerCase().includes(searchLower) ||
      comp.location.toLowerCase().includes(searchLower);

    const matchesCategory = filterCategory === "All" || comp.category === filterCategory;
    const matchesPriority = filterPriority === "All" || comp.priorityLevel === filterPriority;
    const matchesStatus = filterStatus === "All" || comp.status === filterStatus;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  // Calculate Metrics for Analytics View
  const totalComplaints = complaints.length;
  const pendingCount = complaints.filter(c => c.status === "Pending").length;
  const progressCount = complaints.filter(c => c.status === "In Progress").length;
  const resolvedCount = complaints.filter(c => c.status === "Resolved").length;
  const totalDuplicates = complaints.reduce((sum, c) => sum + (c.reportCount - 1), 0);
  const averagePriority = complaints.length > 0 
    ? Math.round(complaints.reduce((sum, c) => sum + c.priority, 0) / complaints.length) 
    : 0;

  // Chart data: counts by category
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = complaints.filter(c => c.category === cat).length;
    return acc;
  }, {});

  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  return (
    <div className="app-container">
      {/* Header Panel */}
      <header className="app-header">
        <div className="brand-section">
          <span className="brand-logo">🏛️</span>
          <div className="brand-title-group">
            <h1>Delhi Civic Service Navigator</h1>
            <p>Intelligent Civic Issue Routing &amp; Duplication Shield</p>
          </div>
        </div>

        {/* Global Tab Switcher */}
        <div className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === "portal" ? "active" : ""}`}
            onClick={() => setActiveTab("portal")}
          >
            📢 Citizen Portal
          </button>
          <button 
            className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            🏢 Department Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            📊 Live Analytics
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* --- CITIZEN PORTAL --- */}
        {activeTab === "portal" && (
          <div className="portal-grid">
            {/* Report Form Card */}
            <div className="glass-card">
              <h2 className="drawer-section-title" style={{ fontSize: "18px", borderLeftColor: "var(--metro-blue)", marginBottom: "20px" }}>
                Report a Civic Issue in Delhi
              </h2>

              {submitResult ? (
                // Success banner
                <div className="success-banner-container">
                  <div className="success-banner">
                    <div className="success-banner-title">
                      ✅ {submitResult.isDuplicate ? "Report Linked to Existing Issue" : "Complaint Successfully Filed!"}
                    </div>
                    <p>{submitResult.message}</p>
                  </div>
                  
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border-glass)", marginBottom: "20px" }}>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>Reference Complaint ID</p>
                    <p style={{ fontFamily: "monospace", fontSize: "18px", fontWeight: "700", color: "var(--metro-blue)" }}>{submitResult.complaint.id}</p>
                    <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "12px" }}>
                      <strong>Department Routed:</strong> {submitResult.complaint.department}
                    </p>
                    <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px" }}>
                      <strong>Category Detected:</strong> {submitResult.complaint.category}
                    </p>
                    <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px" }}>
                      <strong>Assigned Priority:</strong> {submitResult.complaint.priorityLevel}
                    </p>
                  </div>

                  <button className="btn-primary" onClick={resetForm} style={{ width: "100%" }}>
                    Report Another Issue
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitComplaint}>
                  <div className="form-group">
                    <label>Describe the Civic Issue *</label>
                    <textarea 
                      placeholder="E.g., There is a huge pothole outside Gate 3 of Rajiv Chowk Metro Station causing traffic build-up..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={1000}
                      required
                    />
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "right" }}>
                      {description.length}/1000 characters
                    </p>
                  </div>

                  {/* AI Autofill Indicator Feedback */}
                  {aiSuggestion && (
                    <div className="ai-autofill-indicator" style={{ marginBottom: "20px" }}>
                      <span className="sparkle-icon">✨</span>
                      <div>
                        <strong>AI Categorization Model Confidence ({Math.round(aiSuggestion.confidence * 100)}%):</strong>
                        <p style={{ fontSize: "12px", marginTop: "2px" }}>
                          Auto-detects: <span style={{ color: "var(--metro-blue)" }}>{aiSuggestion.category}</span> routed to <strong>{aiSuggestion.department}</strong>. Severity: <span style={{ fontWeight: "600" }}>{aiSuggestion.severity}</span>
                        </p>
                        {aiSuggestion.location && aiSuggestion.location !== "Delhi (General Location)" && (
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Location parsed: "{aiSuggestion.location}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Upload Photo of the Issue</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      style={{ display: "none" }}
                      ref={fileInputRef}
                    />
                    
                    {!imagePreview ? (
                      <div className="image-upload-zone" onClick={triggerFileInput}>
                        <span className="upload-icon">📸</span>
                        <div>
                          <p style={{ fontWeight: "600", fontSize: "13.5px" }}>Click to upload file</p>
                          <p style={{ color: "var(--text-muted)", fontSize: "11.5px" }}>JPEG, PNG, WebP supported</p>
                        </div>
                      </div>
                    ) : (
                      <div className="preview-container">
                        <img src={imagePreview} className="preview-img" alt="Issue upload preview" />
                        <button type="button" className="remove-img-btn" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Your Name (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Amit"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Your Phone (Optional)</label>
                      <input 
                        type="tel" 
                        placeholder="e.g. 98XXXXXXXX"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Location Override / Landmark (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Near Rajiv Chowk Metro Gate 3"
                      value={locationOverride}
                      onChange={(e) => setLocationOverride(e.target.value)}
                    />
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Leave blank if description contains location or you want AI to parse it.
                    </p>
                  </div>

                  {errorMessage && (
                    <p style={{ color: "var(--metro-red)", fontSize: "13px", marginBottom: "15px" }}>
                      ⚠️ {errorMessage}
                    </p>
                  )}

                  <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={submitting}>
                    {submitting ? "Processing AI Filters..." : "Submit Complaint to Department"}
                  </button>
                </form>
              )}
            </div>

            {/* Tracking Status Card */}
            <div className="glass-card track-section">
              <h2 className="drawer-section-title" style={{ fontSize: "18px", borderLeftColor: "var(--metro-yellow)" }}>
                Track Complaint Status
              </h2>
              
              <form onSubmit={handleTrackComplaint} className="search-input-group">
                <input 
                  type="text" 
                  placeholder="Enter Reference Complaint ID (e.g. comp_1)" 
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  required
                />
                <button type="submit" className="btn-secondary" disabled={trackingLoading}>
                  {trackingLoading ? "Searching..." : "Track"}
                </button>
              </form>

              {trackingError && (
                <p style={{ color: "var(--metro-red)", fontSize: "13px" }}>
                  ⚠️ {trackingError}
                </p>
              )}

              {trackedComplaint && (
                <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: "600" }}>{trackedComplaint.title}</h3>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Location: {trackedComplaint.location}</p>
                    </div>
                    <span className={`badge badge-${trackedComplaint.status.toLowerCase().replace(" ", "")}`}>
                      {trackedComplaint.status}
                    </span>
                  </div>

                  {/* Status Timeline */}
                  <div className="timeline">
                    <div 
                      className="timeline-progress" 
                      style={{ 
                        width: 
                          trackedComplaint.status === "Pending" ? "0%" :
                          trackedComplaint.status === "In Progress" ? "50%" : "100%" 
                      }} 
                    />
                    
                    <div className="timeline-step completed">
                      <div className="timeline-node">1</div>
                      <span className="timeline-label">Submitted</span>
                    </div>
                    <div className={`timeline-step ${trackedComplaint.status !== "Pending" ? "completed" : "active"}`}>
                      <div className="timeline-node">2</div>
                      <span className="timeline-label">Assigned</span>
                    </div>
                    <div className={`timeline-step ${trackedComplaint.status === "Resolved" ? "completed" : trackedComplaint.status === "In Progress" ? "active" : ""}`}>
                      <div className="timeline-node">3</div>
                      <span className="timeline-label">In Progress</span>
                    </div>
                    <div className={`timeline-step ${trackedComplaint.status === "Resolved" ? "completed" : ""}`}>
                      <div className="timeline-node">4</div>
                      <span className="timeline-label">Resolved</span>
                    </div>
                  </div>

                  {/* Complaint Details */}
                  <div style={{ padding: "16px", background: "rgba(0,0,0,0.15)", borderRadius: "10px", border: "1px solid var(--border-glass)" }}>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      <strong>Department:</strong> {trackedComplaint.department}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      <strong>Priority Meter:</strong> <span style={{ color: `var(--priority-${trackedComplaint.priorityLevel.toLowerCase()})`, fontWeight: "600" }}>{trackedComplaint.priorityLevel}</span>
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      <strong>Total Report Count:</strong> {trackedComplaint.reportCount} (Increased priority weight based on repeated alerts)
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic", marginTop: "12px", borderTop: "1px solid var(--border-glass)", paddingTop: "10px" }}>
                      "{trackedComplaint.description}"
                    </p>
                  </div>

                  {/* Complaint History Logs */}
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "10px" }}>Status Logs &amp; History</h4>
                    <div className="history-timeline">
                      {trackedComplaint.history && trackedComplaint.history.map((log, index) => {
                        let dotColor = "var(--text-muted)";
                        if (log.status === "In Progress") dotColor = "var(--metro-blue)";
                        if (log.status === "Resolved") dotColor = "var(--metro-green)";
                        
                        return (
                          <div key={index} className="history-item" style={{ "--dot-color": dotColor }}>
                            <div className="history-time">{new Date(log.timestamp).toLocaleString()}</div>
                            <div className="history-desc">
                              <strong>Status: {log.status}</strong> - {log.note}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Images attached */}
                  {trackedComplaint.images && trackedComplaint.images.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "10px" }}>Citizen Supporting Evidence ({trackedComplaint.images.length})</h4>
                      <div className="photo-gallery">
                        {trackedComplaint.images.map((img, i) => (
                          <div key={i} className="gallery-photo-wrapper" onClick={() => setModalImage(`${MEDIA_URL}/${img}`)}>
                            <img src={`${MEDIA_URL}/${img}`} className="gallery-photo" alt="evidence" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- DEPARTMENT DASHBOARD --- */}
        {activeTab === "dashboard" && (
          <div>
            {/* Filter controls */}
            <div className="filter-bar">
              <div className="search-bar">
                <input 
                  type="text" 
                  placeholder="🔍 Search complaints by ID, title, keyword, or location..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "8px 14px" }}
                />
              </div>

              <div className="filter-group">
                <label>Category</label>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Priority</label>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  <option value="All">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Dashboard Workspace */}
            <div className={`dashboard-layout ${selectedComplaint ? "drawer-open" : ""}`}>
              {/* Complaints Table List */}
              <div className="list-pane glass-card" style={{ padding: "0" }}>
                <div className="table-container">
                  <table className="complaints-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Complaint Details</th>
                        <th>Category</th>
                        <th>Priority Meter</th>
                        <th>Status</th>
                        <th>Reports</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComplaints.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="empty-state">
                            No complaints matching active filters found.
                          </td>
                        </tr>
                      ) : (
                        filteredComplaints.map(comp => {
                          const priorityColor = 
                            comp.priorityLevel === "Critical" ? "var(--priority-critical)" :
                            comp.priorityLevel === "High" ? "var(--priority-high)" :
                            comp.priorityLevel === "Medium" ? "var(--priority-medium)" :
                            "var(--priority-low)";

                          return (
                            <tr 
                              key={comp.id}
                              className={selectedComplaint && selectedComplaint.id === comp.id ? "selected" : ""}
                              onClick={() => setSelectedComplaint(comp)}
                            >
                              <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                                {comp.id}
                              </td>
                              <td>
                                <div className="complaint-title-cell">
                                  <span className="complaint-title-text">{comp.title}</span>
                                  <span className="complaint-loc-text">📍 {comp.location}</span>
                                </div>
                              </td>
                              <td>
                                <span style={{ fontSize: "12px", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px" }}>
                                  {comp.category}
                                </span>
                              </td>
                              <td>
                                <div className="priority-meter-wrapper">
                                  <div className="priority-meter-text">
                                    <span style={{ color: priorityColor, fontWeight: "700", fontSize: "10.5px" }}>
                                      {comp.priorityLevel === "Critical" ? "🔴 Critical" :
                                       comp.priorityLevel === "High" ? "🟠 High" :
                                       comp.priorityLevel === "Medium" ? "🟡 Medium" : "🟢 Low"}
                                    </span>
                                    <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{comp.priority}%</span>
                                  </div>
                                  <div className="priority-meter-bar">
                                    <div className="priority-meter-fill" style={{ width: `${comp.priority}%`, "--fill-color": priorityColor }} />
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`badge badge-${comp.status.toLowerCase().replace(" ", "")}`}>
                                  {comp.status}
                                </span>
                              </td>
                              <td style={{ textAlign: "center", fontWeight: "600", color: comp.reportCount > 1 ? "var(--metro-yellow)" : "var(--text-secondary)" }}>
                                {comp.reportCount} {comp.reportCount > 1 && "🔥"}
                              </td>
                              <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                {new Date(comp.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detail drawer when item selected */}
              {selectedComplaint && (
                <div className="detail-drawer glass-card">
                  <div className="drawer-header">
                    <div>
                      <p style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--text-muted)" }}>{selectedComplaint.id}</p>
                      <h3 style={{ fontSize: "18px", fontWeight: "700", marginTop: "4px" }}>{selectedComplaint.title}</h3>
                      <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px" }}>📍 Location: {selectedComplaint.location}</p>
                    </div>
                    <button className="close-btn" onClick={() => setSelectedComplaint(null)}>✕</button>
                  </div>

                  {/* AI Structured Summary */}
                  <div>
                    <h4 className="drawer-section-title">AI Processing Report</h4>
                    <div className="ai-report-box">
                      <div className="ai-report-meta">
                        <div className="ai-meta-item">
                          <span className="ai-meta-label">Category</span>
                          <span className="ai-meta-val" style={{ color: "var(--metro-blue)" }}>{selectedComplaint.category}</span>
                        </div>
                        <div className="ai-meta-item">
                          <span className="ai-meta-label">Severity</span>
                          <span className="ai-meta-val">{selectedComplaint.severity}</span>
                        </div>
                        <div className="ai-meta-item">
                          <span className="ai-meta-label">Recommended Dept</span>
                          <span className="ai-meta-val" style={{ fontSize: "11.5px" }}>{selectedComplaint.department}</span>
                        </div>
                        <div className="ai-meta-item">
                          <span className="ai-meta-label">Auto-Route Target</span>
                          <span className="ai-meta-val" style={{ color: "var(--metro-green)", fontSize: "11px" }}>{selectedComplaint.department.split(" ")[0]} Gateway</span>
                        </div>
                      </div>
                      <div className="ai-summary-text">
                        "{selectedComplaint.summary || "No AI summary compiled."}"
                      </div>
                    </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div>
                    <h4 className="drawer-section-title">Priority Breakdown</h4>
                    <div style={{ background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-glass)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px" }}>Score Weight:</span>
                        <strong style={{ 
                          color: 
                            selectedComplaint.priorityLevel === "Critical" ? "var(--priority-critical)" :
                            selectedComplaint.priorityLevel === "High" ? "var(--priority-high)" :
                            selectedComplaint.priorityLevel === "Medium" ? "var(--priority-medium)" :
                            "var(--priority-low)"
                        }}>
                          {selectedComplaint.priorityLevel} ({selectedComplaint.priority}%)
                        </strong>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div>• Base Severity Score ({selectedComplaint.severity}): {selectedComplaint.severity === "Critical" ? 80 : selectedComplaint.severity === "High" ? 60 : selectedComplaint.severity === "Medium" ? 35 : 15} pts</div>
                        <div>• Report Weight Bonus ({selectedComplaint.reportCount} reports): +{selectedComplaint.reportCount > 1 ? Math.round(12 * Math.log(selectedComplaint.reportCount)) : 0} pts</div>
                        <div>• Time Elapsed Factor (Resolved Cap): +{Math.min(20, Math.floor(Math.max(0, (Date.now() - new Date(selectedComplaint.createdAt).getTime()) / (1000 * 60 * 60))))} pts</div>
                        {selectedComplaint.description.match(/(sparks|fire|live wire|accident|danger|injured|open manhole)/i) && (
                          <div style={{ color: "var(--metro-yellow)" }}>• Public Safety Hazard Adjustment: +10 pts</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Photo Evidence Gallery */}
                  {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                    <div>
                      <h4 className="drawer-section-title">Supporting Media ({selectedComplaint.images.length})</h4>
                      <div className="photo-gallery">
                        {selectedComplaint.images.map((img, i) => (
                          <div key={i} className="gallery-photo-wrapper" onClick={() => setModalImage(`${MEDIA_URL}/${img}`)}>
                            <img src={`${MEDIA_URL}/${img}`} className="gallery-photo" alt="complaint proof" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Original user descriptions (with timestamps & metadata) */}
                  <div>
                    <h4 className="drawer-section-title">Citizen Submissions ({drawerReports.length || selectedComplaint.reportCount})</h4>
                    <div className="reports-list">
                      {drawerReports.length === 0 ? (
                        <div className="report-item">
                          <div className="report-item-header">
                            <span>{selectedComplaint.userName || "Citizen"}</span>
                            <span>{new Date(selectedComplaint.createdAt).toLocaleString()}</span>
                          </div>
                          <p>{selectedComplaint.description}</p>
                        </div>
                      ) : (
                        drawerReports.map(rep => (
                          <div key={rep.id} className="report-item">
                            <div className="report-item-header">
                              <span>👤 {rep.userName || "Citizen"} ({rep.userPhone || "No Phone"})</span>
                              <span>{new Date(rep.createdAt).toLocaleString()}</span>
                            </div>
                            <p>{rep.description}</p>
                            {rep.image && (
                              <span 
                                style={{ fontSize: "11px", color: "var(--metro-blue)", cursor: "pointer", display: "inline-block", marginTop: "6px" }}
                                onClick={() => setModalImage(`${MEDIA_URL}/${rep.image}`)}
                              >
                                🖼️ View report attachment
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* History timelines */}
                  <div>
                    <h4 className="drawer-section-title">Action History Log</h4>
                    <div className="history-timeline">
                      {selectedComplaint.history && selectedComplaint.history.map((log, index) => {
                        let dotColor = "var(--text-muted)";
                        if (log.status === "In Progress") dotColor = "var(--metro-blue)";
                        if (log.status === "Resolved") dotColor = "var(--metro-green)";

                        return (
                          <div key={index} className="history-item" style={{ "--dot-color": dotColor }}>
                            <div className="history-time">{new Date(log.timestamp).toLocaleString()}</div>
                            <div className="history-desc">
                              <strong>Status: {log.status}</strong> - {log.note}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Update Status form */}
                  <div className="update-status-panel" style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "16px" }}>
                    <h4 className="drawer-section-title">Administrative Actions</h4>
                    <form onSubmit={handleUpdateStatus}>
                      <div className="form-group">
                        <label>Update Status</label>
                        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Action Remarks / Note</label>
                        <textarea 
                          placeholder="Write status update note or action report..."
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          style={{ minHeight: "80px" }}
                        />
                      </div>
                      <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={updatingStatus}>
                        {updatingStatus ? "Saving Changes..." : "Apply Remarks &amp; Route Updates"}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- LIVE ANALYTICS --- */}
        {activeTab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* KPI cards */}
            <div className="stats-grid">
              <div className="glass-card stat-card" style={{ "--accent-color": "var(--status-pending)" }}>
                <div className="stat-label">Pending Complaints</div>
                <div className="stat-val-group">
                  <span className="stat-value">{pendingCount}</span>
                  <span className="stat-sub">unassigned/new</span>
                </div>
              </div>
              <div className="glass-card stat-card" style={{ "--accent-color": "var(--status-inprogress)" }}>
                <div className="stat-label">In Progress</div>
                <div className="stat-val-group">
                  <span className="stat-value">{progressCount}</span>
                  <span className="stat-sub">active repairs</span>
                </div>
              </div>
              <div className="glass-card stat-card" style={{ "--accent-color": "var(--status-resolved)" }}>
                <div className="stat-label">Resolved Issues</div>
                <div className="stat-val-group">
                  <span className="stat-value">{resolvedCount}</span>
                  <span className="stat-sub">fixed this week</span>
                </div>
              </div>
              <div className="glass-card stat-card" style={{ "--accent-color": "var(--metro-yellow)" }}>
                <div className="stat-label">Shield Shielded</div>
                <div className="stat-val-group">
                  <span className="stat-value">{totalDuplicates}</span>
                  <span className="stat-sub">duplicates blocked</span>
                </div>
              </div>
              <div className="glass-card stat-card" style={{ "--accent-color": "var(--metro-magenta)" }}>
                <div className="stat-label">Average Priority</div>
                <div className="stat-val-group">
                  <span className="stat-value">{averagePriority}%</span>
                  <span className="stat-sub">severity factor</span>
                </div>
              </div>
            </div>

            {/* Two-Column Analytics Charts */}
            <div className="portal-grid">
              {/* Chart Column */}
              <div className="glass-card">
                <h3 className="drawer-section-title" style={{ fontSize: "16px", marginBottom: "20px" }}>
                  Active Issues distribution by Civic Category
                </h3>
                <div className="chart-container">
                  {CATEGORIES.map(cat => {
                    const count = categoryCounts[cat] || 0;
                    const heightPercent = Math.max(5, (count / maxCategoryCount) * 100);
                    
                    return (
                      <div key={cat} className="chart-bar" style={{ height: `${heightPercent}%` }}>
                        <span className="chart-bar-hover-val">{count}</span>
                        {/* Shorthand label to fit */}
                        <div 
                          className="chart-label" 
                          style={{ 
                            position: "absolute", 
                            bottom: "-25px", 
                            left: "50%", 
                            transform: "translateX(-50%) rotate(45deg)", 
                            transformOrigin: "left top",
                            whiteSpace: "nowrap",
                            fontSize: "8.5px"
                          }}
                        >
                          {cat}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ height: "60px" }} /> {/* spacer for rotated labels */}
              </div>

              {/* Department Statistics Summary */}
              <div className="glass-card">
                <h3 className="drawer-section-title" style={{ fontSize: "16px", marginBottom: "20px" }}>
                  Delhi Government Agency Performance Logs
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {[
                    { dept: "MCD (Municipal Corporation of Delhi)", color: "var(--metro-magenta)", desc: "Waste collection, Street lights, Encroachment, Toilets" },
                    { dept: "PWD (Public Works Department)", color: "var(--metro-blue)", desc: "Road repair, Drainage networks" },
                    { dept: "DJB (Delhi Jal Board)", color: "var(--metro-green)", desc: "Sewage systems, Water leaks, Water supply" },
                    { dept: "Delhi Traffic Police", color: "var(--metro-yellow)", desc: "Traffic signals, Illegal parking enforcement" },
                    { dept: "DTL / DISCOM (Tata Power/BSES)", color: "var(--metro-red)", desc: "Transformers, Power cuts, Electrical wires" }
                  ].map((item, index) => {
                    const deptComplaints = complaints.filter(c => c.department.startsWith(item.dept.split(" ")[0]));
                    const deptTotal = deptComplaints.length;
                    const deptResolved = deptComplaints.filter(c => c.status === "Resolved").length;
                    const pctResolved = deptTotal > 0 ? Math.round((deptResolved / deptTotal) * 100) : 0;

                    return (
                      <div key={index} style={{ padding: "12px", background: "rgba(0,0,0,0.15)", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontWeight: "600", fontSize: "13px" }}>{item.dept}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{deptResolved}/{deptTotal} Resolved</span>
                        </div>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>{item.desc}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div className="priority-meter-bar" style={{ flexGrow: 1, height: "4px" }}>
                            <div className="priority-meter-fill" style={{ width: `${pctResolved}%`, "--fill-color": item.color }} />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: "700", width: "30px", textAlign: "right" }}>{pctResolved}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL IMAGE LIGHTBOX VIEWER --- */}
      {modalImage && (
        <div className="modal-overlay" onClick={() => setModalImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={modalImage} className="modal-img" alt="Evidence Preview" />
            <div className="modal-caption">
              Delhi Civic Service Navigator - Photo Evidence
            </div>
            <button 
              type="button" 
              className="remove-img-btn" 
              onClick={() => setModalImage(null)}
              style={{ top: "-15px", right: "-15px", background: "var(--bg-dark)", border: "1px solid var(--border-glass)" }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
