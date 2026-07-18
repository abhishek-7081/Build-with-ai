import React, { useState, useEffect, useRef } from "react";

// Read API URL from environment configuration with local fallback
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
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

const DEPARTMENTS = [
  {
    id: "MCD",
    name: "MCD Portal",
    fullName: "Municipal Corporation of Delhi",
    icon: "🧹",
    color: "var(--metro-magenta)",
    desc: "Handles garbage collection, street lights, encroachment, and public toilets.",
    categories: ["Garbage Collection", "Street Lights", "Encroachment", "Public Toilets"]
  },
  {
    id: "PWD",
    name: "PWD Portal",
    fullName: "Public Works Department",
    icon: "🛣️",
    color: "var(--metro-blue)",
    desc: "Handles road damage, drainage networks, and major flyovers.",
    categories: ["Road Damage", "Drainage"]
  },
  {
    id: "DJB",
    name: "Delhi Jal Board",
    fullName: "Water & Sewage Management",
    icon: "💧",
    color: "var(--metro-green)",
    desc: "Handles water supply, water leakage, sewer overflow, and drainage blockage.",
    categories: ["Water Supply", "Water Leakage", "Sewage Problems"]
  },
  {
    id: "Traffic",
    name: "Delhi Traffic Police",
    fullName: "Traffic Enforcement Gateway",
    icon: "🚦",
    color: "var(--metro-yellow)",
    desc: "Handles traffic signals, zebra crossings, blinkers, and illegal parking.",
    categories: ["Traffic Signals", "Illegal Parking"]
  },
  {
    id: "Electricity",
    name: "Electricity Board",
    fullName: "DISCOM / Power Grid Gateway",
    icon: "⚡",
    color: "var(--metro-red)",
    desc: "Handles transformers, spark failures, power cuts, and loose electric lines.",
    categories: ["Electricity"]
  },
  {
    id: "SuperAdmin",
    name: "Super Admin Gateway",
    fullName: "Central Civic Command Center",
    icon: "👑",
    color: "var(--text-primary)",
    desc: "Access all complaints across all municipal departments in Delhi.",
    categories: ["All Categories"]
  }
];

function App() {
  const [activeTab, setActiveTab] = useState("portal"); // portal, dashboard, analytics
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Authenticated State (Citizen Session)
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u && u !== "undefined" ? JSON.parse(u) : null;
    } catch (err) {
      console.error("Failed to parse user session on mount:", err);
      return null;
    }
  });
  
  // Auth Form State
  const [authMode, setAuthMode] = useState("login"); // login, signup
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // My Submissions Feed
  const [myComplaints, setMyComplaints] = useState([]);
  const [mySubmissionsView, setMySubmissionsView] = useState("report"); // report, list
  const [loadingMyComplaints, setLoadingMyComplaints] = useState(false);

  // Citizen Portal Form State
  const [description, setDescription] = useState("");
  const [locationOverride, setLocationOverride] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Geolocation Coordinate State (Center of Delhi defaults)
  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.2090);

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
  const [selectedDept, setSelectedDept] = useState(null); // null, MCD, PWD, DJB, Traffic, Electricity, SuperAdmin
  
  // Dashboard Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Modal Image Preview State
  const [modalImage, setModalImage] = useState(null);

  const fileInputRef = useRef(null);
  const pickerMarkerRef = useRef(null);

  // Load complaints initially
  useEffect(() => {
    fetchComplaints();
  }, []);

  // Sync citizen's own submitted reports when complaints are added or authentication state updates
  useEffect(() => {
    if (user && token) {
      fetchMyComplaints();
    }
  }, [user, token, complaints]);

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

  const fetchMyComplaints = async () => {
    if (!token) return;
    setLoadingMyComplaints(true);
    try {
      const res = await fetch(`${API_URL}/citizen/my-complaints`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyComplaints(data);
      }
    } catch (err) {
      console.error("Failed to load citizen issues:", err);
    } finally {
      setLoadingMyComplaints(false);
    }
  };

  // Dynamic AI feedback typing feedback
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
        // Silent error
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [description]);

  // Fetch reports when selected complaint in dashboard changes
  useEffect(() => {
    if (selectedComplaint) {
      const targetId = selectedComplaint._id || selectedComplaint.id;
      fetchComplaintReports(targetId);
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

  // Map Picker Leaflet Integration (Citizen Form)
  useEffect(() => {
    if (activeTab !== "portal" || !user || submitResult || mySubmissionsView !== "report") return;
    
    const timer = setTimeout(() => {
      if (!window.L) return;
      
      // Clean up previous picker map
      if (window.pickerMap) {
        try {
          window.pickerMap.remove();
        } catch (e) {
          console.warn("Error removing previous picker map:", e);
        }
        window.pickerMap = null;
      }
      
      const mapContainer = document.getElementById("map-picker");
      if (!mapContainer) return;

      try {
        const map = window.L.map("map-picker").setView([latitude, longitude], 12);
        window.pickerMap = map;

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = window.L.marker([latitude, longitude], { draggable: true }).addTo(map);
        pickerMarkerRef.current = marker;

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          setLatitude(parseFloat(position.lat.toFixed(6)));
          setLongitude(parseFloat(position.lng.toFixed(6)));
        });

        map.on("click", (e) => {
          marker.setLatLng(e.latlng);
          setLatitude(parseFloat(e.latlng.lat.toFixed(6)));
          setLongitude(parseFloat(e.latlng.lng.toFixed(6)));
        });
      } catch (err) {
        console.error("Leaflet picker map creation error:", err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [activeTab, user, submitResult, mySubmissionsView]);

  // Dashboard Master Map Leaflet Integration
  useEffect(() => {
    if (activeTab !== "dashboard" || !selectedDept) return;

    const timer = setTimeout(() => {
      if (!window.L) return;

      if (window.dashboardMap) {
        try {
          window.dashboardMap.remove();
        } catch (e) {
          console.warn("Error removing dashboard map:", e);
        }
        window.dashboardMap = null;
      }

      const mapContainer = document.getElementById("dashboard-map");
      if (!mapContainer) return;

      try {
        const map = window.L.map("dashboard-map").setView([28.6139, 77.2090], 11);
        window.dashboardMap = map;

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Plot complaints on dashboard master map
        filteredComplaints.forEach(comp => {
          if (comp.locationCoords && comp.locationCoords.lat && comp.locationCoords.lng) {
            const markerColor = 
              comp.priorityLevel === "Critical" ? "#ef4444" :
              comp.priorityLevel === "High" ? "#f43f5e" :
              comp.priorityLevel === "Medium" ? "#fbbf24" : "#10b981";

            const marker = window.L.circleMarker([comp.locationCoords.lat, comp.locationCoords.lng], {
              radius: 8,
              fillColor: markerColor,
              color: "#ffffff",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.9
            }).addTo(map);

            const compId = comp._id || comp.id;

            marker.bindPopup(`
              <div style="font-family: 'Inter', sans-serif;">
                <strong>${comp.title}</strong><br/>
                Category: ${comp.category}<br/>
                Priority: ${comp.priorityLevel} (${comp.priority}%)<br/>
                Status: ${comp.status}<br/>
                <button 
                  class="btn-secondary" 
                  style="padding: 4px 8px; font-size: 10.5px; margin-top: 8px; width: 100%; cursor: pointer;" 
                  onclick="document.dispatchEvent(new CustomEvent('selectComplaint', {detail: '${compId}'}))"
                >
                  Inspect Issue details
                </button>
              </div>
            `);
          }
        });
      } catch (err) {
        console.error("Leaflet dashboard map creation error:", err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [activeTab, selectedDept, complaints, searchQuery, filterCategory, filterPriority, filterStatus]);

  // Drawer Mini Map Leaflet Integration
  useEffect(() => {
    if (!selectedComplaint || !selectedComplaint.locationCoords) return;

    const timer = setTimeout(() => {
      if (!window.L) return;

      if (window.drawerMap) {
        try {
          window.drawerMap.remove();
        } catch (e) {
          console.warn("Error removing drawer map:", e);
        }
        window.drawerMap = null;
      }

      const mapContainer = document.getElementById("drawer-map");
      if (!mapContainer) return;

      try {
        const { lat, lng } = selectedComplaint.locationCoords;
        const map = window.L.map("drawer-map").setView([lat, lng], 14);
        window.drawerMap = map;

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        window.L.marker([lat, lng]).addTo(map)
          .bindPopup(`<strong>${selectedComplaint.title}</strong><br/>${selectedComplaint.location}`)
          .openPopup();
      } catch (err) {
        console.error("Leaflet drawer map creation error:", err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedComplaint]);

  // Bind custom popup buttons back to React state selection
  useEffect(() => {
    const handler = (e) => {
      const compId = e.detail;
      const comp = complaints.find(c => c._id === compId || c.id === compId);
      if (comp) {
        setSelectedComplaint(comp);
      }
    };
    document.addEventListener("selectComplaint", handler);
    return () => document.removeEventListener("selectComplaint", handler);
  }, [complaints]);

  // HTML5 Geolocator trigger
  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lng = parseFloat(position.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          
          if (window.pickerMap) {
            window.pickerMap.setView([lat, lng], 15);
          }
          if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setLatLng([lat, lng]);
          }
        },
        (error) => {
          alert("Could not retrieve current coordinates. Please manually click on the map to pin the issue.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  // Handle Authentication (Login/Signup submissions)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    const url = authMode === "login" ? `${API_URL}/auth/login` : `${API_URL}/auth/signup`;
    const payload = authMode === "login" 
      ? { phone: authPhone, password: authPassword }
      : { name: authName, phone: authPhone, password: authPassword };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        
        // Clear fields
        setAuthPassword("");
        setAuthPhone("");
        setAuthName("");
      } else {
        setAuthError(data.error || "Authentication failed.");
      }
    } catch (err) {
      setAuthError("Could not connect to authentication services.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
  };

  // Trigger file selection input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Image Preview Input
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

  // Reset reporting form
  const resetForm = () => {
    setDescription("");
    setLocationOverride("");
    setImageFile(null);
    setImagePreview(null);
    setAiSuggestion(null);
    setSubmitResult(null);
    setLatitude(28.6139);
    setLongitude(77.2090);
  };

  // Submit Complaint Form (links account automatically)
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setErrorMessage("");
    setSubmitResult(null);

    const formData = new FormData();
    formData.append("description", description);
    formData.append("locationOverride", locationOverride);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const res = await fetch(`${API_URL}/complaints`, {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitResult(data);
        fetchComplaints(); // Refresh dashboards
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
      const matched = complaints.find(c => c._id === trackingId.trim() || c.id === trackingId.trim());
      if (matched) {
        const matchedId = matched._id || matched.id;
        const res = await fetch(`${API_URL}/complaints/${matchedId}/reports`);
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
    const targetId = selectedComplaint._id || selectedComplaint.id;
    try {
      const res = await fetch(`${API_URL}/complaints/${targetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus, note: statusNote })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setComplaints(prev => prev.map(c => (c._id === targetId || c.id === targetId) ? data.complaint : c));
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
    if (selectedDept && selectedDept !== "SuperAdmin") {
      let deptMatch = false;
      if (selectedDept === "MCD") deptMatch = comp.department.includes("MCD");
      if (selectedDept === "PWD") deptMatch = comp.department.includes("PWD");
      if (selectedDept === "DJB") deptMatch = comp.department.includes("DJB");
      if (selectedDept === "Traffic") deptMatch = comp.department.includes("Traffic");
      if (selectedDept === "Electricity") deptMatch = comp.department.includes("DTL") || comp.department.includes("DISCOM");
      if (!deptMatch) return false;
    }

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (comp._id && comp._id.toLowerCase().includes(searchLower)) ||
      (comp.id && comp.id.toLowerCase().includes(searchLower)) ||
      comp.title.toLowerCase().includes(searchLower) ||
      comp.description.toLowerCase().includes(searchLower) ||
      comp.location.toLowerCase().includes(searchLower);

    const matchesCategory = filterCategory === "All" || comp.category === filterCategory;
    const matchesPriority = filterPriority === "All" || comp.priorityLevel === filterPriority;
    const matchesStatus = filterStatus === "All" || comp.status === filterStatus;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  // KPI Metrics calculations
  const totalComplaints = complaints.length;
  const pendingCount = complaints.filter(c => c.status === "Pending").length;
  const progressCount = complaints.filter(c => c.status === "In Progress").length;
  const resolvedCount = complaints.filter(c => c.status === "Resolved").length;
  const totalDuplicates = complaints.reduce((sum, c) => sum + (c.reportCount - 1), 0);
  const averagePriority = complaints.length > 0 
    ? Math.round(complaints.reduce((sum, c) => sum + c.priority, 0) / complaints.length) 
    : 0;

  // Chart category values
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = complaints.filter(c => c.category === cat).length;
    return acc;
  }, {});

  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  return (
    <div className="app-container">
      {/* Header bar */}
      <header className="app-header">
        <div className="brand-section">
          <span className="brand-logo">🏛️</span>
          <div className="brand-title-group">
            <h1>Delhi Civic Service Navigator</h1>
            <p>Intelligent Routing, Cloud Storage, &amp; Hotspot Maps</p>
          </div>
        </div>

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

      {/* Main Container */}
      <main className="main-content">
        {/* --- CITIZEN PORTAL --- */}
        {activeTab === "portal" && (
          !user ? (
            // User Auth Login/Signup View
            <div className="auth-modal-overlay">
              <div className="auth-card">
                <div className="auth-tabs">
                  <button 
                    className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                    onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  >
                    Citizen Sign In
                  </button>
                  <button 
                    className={`auth-tab ${authMode === "signup" ? "active" : ""}`}
                    onClick={() => { setAuthMode("signup"); setAuthError(""); }}
                  >
                    Create Account
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {authMode === "signup" && (
                    <div className="form-group" style={{ margin: "0" }}>
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Amit Sharma"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="form-group" style={{ margin: "0" }}>
                    <label>Phone Number (Registered unique ID)</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 9810123456"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: "0" }}>
                    <label>Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter secure password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                    />
                  </div>

                  {authError && (
                    <p style={{ color: "var(--metro-red)", fontSize: "12px" }}>⚠️ {authError}</p>
                  )}

                  <button type="submit" className="btn-primary" style={{ marginTop: "10px" }} disabled={authLoading}>
                    {authLoading ? "Verifying Credentials..." : authMode === "login" ? "Sign In" : "Register Account"}
                  </button>
                </form>

                <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", marginTop: "20px" }}>
                  Demo Login: Phone: <strong style={{ color: "var(--metro-blue)" }}>9810123456</strong>, Password: <strong style={{ color: "var(--metro-blue)" }}>password123</strong>
                </p>
              </div>
            </div>
          ) : (
            // Connected Citizen Portal View
            <div>
              {/* Profile Header */}
              <div className="profile-bar">
                <div className="profile-avatar-group">
                  <div className="profile-avatar">{user?.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
                  <div>
                    <strong>Connected: {user?.name || "Citizen"}</strong> ({user?.phone || ""})
                  </div>
                </div>
                
                <div className="flex-gap">
                  <button 
                    className={`btn-secondary ${mySubmissionsView === "report" ? "active" : ""}`}
                    onClick={() => setMySubmissionsView("report")}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    📢 Report Civic Issue
                  </button>
                  <button 
                    className={`btn-secondary ${mySubmissionsView === "list" ? "active" : ""}`}
                    onClick={() => { setMySubmissionsView("list"); fetchMyComplaints(); }}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    📂 My Reported Issues ({myComplaints.length})
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={handleLogout}
                    style={{ fontSize: "12px", padding: "6px 12px", color: "var(--metro-red)", borderColor: "rgba(239,68,68,0.2)" }}
                  >
                    Log Out
                  </button>
                </div>
              </div>

              {mySubmissionsView === "list" ? (
                // My Submissions Feed
                <div className="glass-card" style={{ animation: "fadeIn 0.3s" }}>
                  <h2 className="drawer-section-title" style={{ fontSize: "18px", borderLeftColor: "var(--metro-blue)", marginBottom: "20px" }}>
                    My Registered Civic Issues &amp; Follow-ups
                  </h2>
                  {loadingMyComplaints ? (
                    <div className="empty-state">Loading your complaints feed...</div>
                  ) : myComplaints.length === 0 ? (
                    <div className="empty-state">
                      You haven't submitted any reports yet. Click on "Report Civic Issue" to start!
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="complaints-table">
                        <thead>
                          <tr>
                            <th>Complaint ID</th>
                            <th>Title &amp; Landmark</th>
                            <th>Routed Agency</th>
                            <th>Priority Score</th>
                            <th>Current Status</th>
                            <th>Track ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myComplaints.map(comp => (
                            <tr key={comp._id || comp.id}>
                              <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{comp._id || comp.id}</td>
                              <td>
                                <div className="complaint-title-cell">
                                  <span className="complaint-title-text">{comp.title}</span>
                                  <span className="complaint-loc-text">📍 Coords: {comp.locationCoords?.lat || "N/A"}, {comp.locationCoords?.lng || "N/A"}</span>
                                </div>
                              </td>
                              <td>{comp.department}</td>
                              <td>
                                <strong style={{ color: `var(--priority-${(comp.priorityLevel || "Medium").toLowerCase()})` }}>
                                  {comp.priorityLevel || "Medium"} ({comp.priority || 0}%)
                                </strong>
                              </td>
                              <td>
                                <span className={`badge badge-${(comp.status || "Pending").toLowerCase().replace(" ", "")}`}>
                                  {comp.status || "Pending"}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn-secondary" 
                                  onClick={() => { 
                                    setTrackingId(comp._id || comp.id); 
                                    setTrackedComplaint(comp); 
                                    setMySubmissionsView("report"); // Switch tab/scroll to tracker
                                  }}
                                  style={{ padding: "4px 8px", fontSize: "11px" }}
                                >
                                  Check Timeline
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                // Standard submission form layout
                <div className="portal-grid">
                  {/* Reporting Form */}
                  <div className="glass-card">
                    <h2 className="drawer-section-title" style={{ fontSize: "18px", borderLeftColor: "var(--metro-blue)", marginBottom: "20px" }}>
                      Report a Civic Issue in Delhi
                    </h2>

                    {submitResult ? (
                      <div className="success-banner-container">
                        <div className="success-banner">
                          <div className="success-banner-title">
                            ✅ {submitResult.isDuplicate ? "Merged with Active Neighborhood Alert" : "Complaint Successfully Logged!"}
                          </div>
                          <p>{submitResult.message}</p>
                        </div>
                        
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border-glass)", marginBottom: "20px" }}>
                          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>Reference Complaint ID</p>
                          <p style={{ fontFamily: "monospace", fontSize: "18px", fontWeight: "700", color: "var(--metro-blue)" }}>{submitResult.complaint._id || submitResult.complaint.id}</p>
                          <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "12px" }}>
                            <strong>Department Assigned:</strong> {submitResult.complaint.department}
                          </p>
                          <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px" }}>
                            <strong>Category Detected:</strong> {submitResult.complaint.category}
                          </p>
                          <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px" }}>
                            <strong>Computed Priority Score:</strong> <span style={{ color: `var(--priority-${(submitResult.complaint.priorityLevel || "Medium").toLowerCase()})`, fontWeight: "700" }}>{submitResult.complaint.priorityLevel || "Medium"} ({submitResult.complaint.priority || 0}%)</span>
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
                            placeholder="E.g., There is a huge sewage spill near Rajiv Chowk Metro Gate 3 causing bad traffic build-up..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={1000}
                            required
                          />
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "right" }}>
                            {description.length}/1000 characters
                          </p>
                        </div>

                        {/* AI auto suggest banner */}
                        {aiSuggestion && (
                          <div className="ai-autofill-indicator" style={{ marginBottom: "20px" }}>
                            <span className="sparkle-icon">✨</span>
                            <div>
                              <strong>AI Classification engine ({Math.round(aiSuggestion.confidence * 100)}% Confidence):</strong>
                              <p style={{ fontSize: "12px", marginTop: "2px" }}>
                                Category: <span style={{ color: "var(--metro-blue)" }}>{aiSuggestion.category}</span> routed to <strong>{aiSuggestion.department}</strong>. Severity: <span style={{ fontWeight: "600" }}>{aiSuggestion.severity}</span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Geolocation Coordinate Selector */}
                        <div className="form-group">
                          <div className="map-picker-banner">
                            <span>📍 Issue Coordinates: <strong>{latitude}</strong>, <strong>{longitude}</strong></span>
                            <button type="button" className="btn-secondary" onClick={handleDetectLocation} style={{ padding: "4px 8px", fontSize: "10.5px" }}>
                              GPS My Location
                            </button>
                          </div>
                          
                          {/* Map div container */}
                          <div id="map-picker" className="map-container-selector"></div>
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Drag the pin marker or click on the map to pinpoint the exact issue location.
                          </p>
                        </div>

                        <div className="form-group">
                          <label>Upload Photo of the Issue (Saved to Cloudinary)</label>
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
                                <p style={{ fontWeight: "600", fontSize: "13.5px" }}>Upload image file</p>
                                <p style={{ color: "var(--text-muted)", fontSize: "11.5px" }}>JPEG, PNG, WebP supported</p>
                              </div>
                            </div>
                          ) : (
                            <div className="preview-container">
                              <img src={imagePreview} className="preview-img" alt="Upload Preview" />
                              <button type="button" className="remove-img-btn" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                                ✕
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="form-group">
                          <label>Specific Landmark / Location Name Override (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Opposite Metro gate 3 parking stand"
                            value={locationOverride}
                            onChange={(e) => setLocationOverride(e.target.value)}
                          />
                        </div>

                        {errorMessage && (
                          <p style={{ color: "var(--metro-red)", fontSize: "13px", marginBottom: "15px" }}>
                            ⚠️ {errorMessage}
                          </p>
                        )}

                        <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={submitting}>
                          {submitting ? "Analyzing and Routing issue..." : "Submit Complaint to Department"}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Tracking Status Timeline Board */}
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
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>📍 Coordinates: {trackedComplaint.locationCoords?.lat}, {trackedComplaint.locationCoords?.lng}</p>
                          </div>
                          <span className={`badge badge-${(trackedComplaint.status || "Pending").toLowerCase().replace(" ", "")}`}>
                            {trackedComplaint.status || "Pending"}
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

                        {/* Detailed information box */}
                        <div style={{ padding: "16px", background: "rgba(0,0,0,0.15)", borderRadius: "10px", border: "1px solid var(--border-glass)" }}>
                          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                            <strong>Department Assigned:</strong> {trackedComplaint.department}
                          </p>
                          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                            <strong>Priority Level:</strong> <span style={{ color: `var(--priority-${(trackedComplaint.priorityLevel || "Medium").toLowerCase()})`, fontWeight: "600" }}>{trackedComplaint.priorityLevel || "Medium"}</span>
                          </p>
                          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                            <strong>Total Reports:</strong> {trackedComplaint.reportCount} citizen submissions consolidated
                          </p>
                          <p style={{ fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic", marginTop: "12px", borderTop: "1px solid var(--border-glass)", paddingTop: "10px" }}>
                            "{trackedComplaint.description}"
                          </p>
                        </div>

                        {/* History Log Timeline */}
                        <div>
                          <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "10px" }}>Timeline &amp; Audit Trail</h4>
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

                        {/* Supporting Photos */}
                        {trackedComplaint.images && trackedComplaint.images.length > 0 && (
                          <div>
                            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "10px" }}>Photos uploaded ({trackedComplaint.images.length})</h4>
                            <div className="photo-gallery">
                              {trackedComplaint.images.map((img, i) => {
                                const imgSrc = img.startsWith("http") ? img : `${MEDIA_URL}/${img}`;
                                return (
                                  <div key={i} className="gallery-photo-wrapper" onClick={() => setModalImage(imgSrc)}>
                                    <img src={imgSrc} className="gallery-photo" alt="evidence" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* --- DEPARTMENT DASHBOARD --- */}
        {activeTab === "dashboard" && (
          selectedDept === null ? (
            <div className="dept-select-container">
              <h2 className="dept-select-title">Select Department Administrative Portal</h2>
              <p className="dept-select-subtitle">Choose your gateway to view and manage assigned civic issues</p>
              
              <div className="dept-grid">
                {DEPARTMENTS.map(dept => {
                  const deptComplaints = complaints.filter(c => {
                    if (dept.id === "SuperAdmin") return c.status !== "Resolved";
                    if (dept.id === "MCD") return c.department.includes("MCD") && c.status !== "Resolved";
                    if (dept.id === "PWD") return c.department.includes("PWD") && c.status !== "Resolved";
                    if (dept.id === "DJB") return c.department.includes("DJB") && c.status !== "Resolved";
                    if (dept.id === "Traffic") return c.department.includes("Traffic") && c.status !== "Resolved";
                    if (dept.id === "Electricity") return (c.department.includes("DTL") || c.department.includes("DISCOM")) && c.status !== "Resolved";
                    return false;
                  });
                  const activeCount = deptComplaints.length;

                  return (
                    <div 
                      key={dept.id} 
                      className="glass-card dept-card"
                      style={{ "--dept-color": dept.color }}
                      onClick={() => {
                        setSelectedDept(dept.id);
                        setSelectedComplaint(null);
                      }}
                    >
                      <div className="dept-card-header">
                        <span className="dept-icon">{dept.icon}</span>
                        {activeCount > 0 ? (
                          <span 
                            className="dept-badge-count" 
                            style={{ 
                              background: "rgba(255, 255, 255, 0.05)",
                              color: dept.color 
                            }}
                          >
                            {activeCount} Active
                          </span>
                        ) : (
                          <span className="dept-badge-count" style={{ fontSize: "11px", color: "var(--text-muted)", background: "rgba(0,0,0,0.1)" }}>0 Active</span>
                        )}
                      </div>
                      <div>
                        <h3 className="dept-name">{dept.name}</h3>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500", marginTop: "2px" }}>{dept.fullName}</p>
                        <p className="dept-desc" style={{ marginTop: "10px" }}>{dept.desc}</p>
                      </div>
                      <div className="dept-categories">
                        <strong>Filters:</strong> {dept.categories.join(", ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              {/* Department Gateway header */}
              <div className="dept-header-panel">
                <div className="dept-header-info">
                  <span style={{ fontSize: "28px" }}>
                    {DEPARTMENTS.find(d => d.id === selectedDept)?.icon}
                  </span>
                  <div>
                    <h2 className="dept-header-title" style={{ color: DEPARTMENTS.find(d => d.id === selectedDept)?.color }}>
                      {DEPARTMENTS.find(d => d.id === selectedDept)?.fullName} Gateway
                    </h2>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Showing issues assigned to <strong>{DEPARTMENTS.find(d => d.id === selectedDept)?.name}</strong>
                    </p>
                  </div>
                </div>
                <button 
                  className="btn-secondary" 
                  onClick={() => {
                    setSelectedDept(null);
                    setSelectedComplaint(null);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  ← Exit Department Gateways
                </button>
              </div>

              {/* Leaflet Master Proximity Hotspot Map */}
              <div className="glass-card" style={{ padding: "16px", marginBottom: "20px" }}>
                <h3 className="drawer-section-title" style={{ fontSize: "14px", marginBottom: "12px" }}>
                  📍 Neighborhood Civic Hotspots map
                </h3>
                <div id="dashboard-map" className="dashboard-master-map"></div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Circular icons indicate complaint coordinates. Crimson/rose circles indicate critical hotspots. Click on dots to inspect details.
                </p>
              </div>

              {/* Table Filters controls */}
              <div className="filter-bar">
                <div className="search-bar">
                  <input 
                    type="text" 
                    placeholder="🔍 Search complaints by ID, title, keyword, or location landmark..." 
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

              {/* Dashboard Grid Pane & drawer */}
              <div className={`dashboard-layout ${selectedComplaint ? "drawer-open" : ""}`}>
                <div className="list-pane glass-card" style={{ padding: "0" }}>
                  <div className="table-container">
                    <table className="complaints-table">
                      <thead>
                        <tr>
                          <th>Reference ID</th>
                          <th>Complaint Details</th>
                          <th>Category</th>
                          <th>Priority meter</th>
                          <th>Status</th>
                          <th>Reports</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredComplaints.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="empty-state">
                              No complaints found matching current filters.
                            </td>
                          </tr>
                        ) : (
                          filteredComplaints.map(comp => {
                            const priorityColor = 
                              comp.priorityLevel === "Critical" ? "var(--priority-critical)" :
                              comp.priorityLevel === "High" ? "var(--priority-high)" :
                              comp.priorityLevel === "Medium" ? "var(--priority-medium)" :
                              "var(--priority-low)";

                            const compId = comp._id || comp.id;

                            return (
                              <tr 
                                key={compId}
                                className={selectedComplaint && (selectedComplaint._id === compId || selectedComplaint.id === compId) ? "selected" : ""}
                                onClick={() => setSelectedComplaint(comp)}
                              >
                                <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                                  {compId.substring(Math.max(0, compId.length - 8))}
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
                                  <span className={`badge badge-${(comp.status || "Pending").toLowerCase().replace(" ", "")}`}>
                                    {comp.status || "Pending"}
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

                {/* Selected Complaint Detail Drawer */}
                {selectedComplaint && (
                  <div className="detail-drawer glass-card">
                    <div className="drawer-header">
                      <div>
                        <p style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--text-muted)" }}>{selectedComplaint._id || selectedComplaint.id}</p>
                        <h3 style={{ fontSize: "18px", fontWeight: "700", marginTop: "4px" }}>{selectedComplaint.title}</h3>
                        <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px" }}>📍 Landmark: {selectedComplaint.location}</p>
                      </div>
                      <button className="close-btn" onClick={() => setSelectedComplaint(null)}>✕</button>
                    </div>

                    {/* Geolocation Details & Drawer Mini Map */}
                    {selectedComplaint.locationCoords && (
                      <div>
                        <h4 className="drawer-section-title">GPS coordinates &amp; Location Map</h4>
                        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                          Coordinates: <strong>{selectedComplaint.locationCoords.lat}</strong>, <strong>{selectedComplaint.locationCoords.lng}</strong>
                        </div>
                        <div id="drawer-map" className="drawer-mini-map"></div>
                      </div>
                    )}

                    {/* AI Structured summary */}
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
                            <span className="ai-meta-label">Agency Router</span>
                            <span className="ai-meta-val" style={{ fontSize: "11.5px" }}>{selectedComplaint.department}</span>
                          </div>
                          <div className="ai-meta-item">
                            <span className="ai-meta-label">Gateway Status</span>
                            <span className="ai-meta-val" style={{ color: "var(--metro-green)", fontSize: "11px" }}>Secure Routing Active</span>
                          </div>
                        </div>
                        <div className="ai-summary-text">
                          "{selectedComplaint.summary || "No AI summary compiled."}"
                        </div>
                      </div>
                    </div>

                    {/* Priority breakdown (factors in proximity hotspots) */}
                    <div>
                      <h4 className="drawer-section-title">Dynamic Priority Meter details</h4>
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
                          <div>• Base Severity ({selectedComplaint.severity}): {selectedComplaint.severity === "Critical" ? 80 : selectedComplaint.severity === "High" ? 60 : selectedComplaint.severity === "Medium" ? 35 : 15} pts</div>
                          <div>• Repeated Submissions Weight ({selectedComplaint.reportCount} reports): +{selectedComplaint.reportCount > 1 ? Math.round(12 * Math.log(selectedComplaint.reportCount)) : 0} pts</div>
                          <div>• Elapsed time multiplier: +{Math.min(20, Math.floor(Math.max(0, (Date.now() - new Date(selectedComplaint.createdAt).getTime()) / (1000 * 60 * 60))))} pts</div>
                          
                          {/* Neighborhood proximity alert boost display */}
                          {selectedComplaint.priority > (selectedComplaint.severity === "Critical" ? 80 : selectedComplaint.severity === "High" ? 60 : selectedComplaint.severity === "Medium" ? 35 : 15) + (selectedComplaint.reportCount > 1 ? Math.round(12 * Math.log(selectedComplaint.reportCount)) : 0) + Math.min(20, Math.floor(Math.max(0, (Date.now() - new Date(selectedComplaint.createdAt).getTime()) / (1000 * 60 * 60)))) && (
                            <div style={{ color: "var(--metro-magenta)", fontWeight: "600" }}>
                              • Area Proximity Hotspot Congestion Boost: Active (Elevated weight due to high-density complaints nearby)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Image gallery supporting URL uploads */}
                    {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                      <div>
                        <h4 className="drawer-section-title">Supporting Evidence ({selectedComplaint.images.length})</h4>
                        <div className="photo-gallery">
                          {selectedComplaint.images.map((img, i) => {
                            const imgSrc = img.startsWith("http") ? img : `${MEDIA_URL}/${img}`;
                            return (
                              <div key={i} className="gallery-photo-wrapper" onClick={() => setModalImage(imgSrc)}>
                                <img src={imgSrc} className="gallery-photo" alt="complaint proof" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Citizen reports history */}
                    <div>
                      <h4 className="drawer-section-title">Citizen Submissions ({drawerReports.length || selectedComplaint.reportCount})</h4>
                      <div className="reports-list">
                        {drawerReports.length === 0 ? (
                          <div className="report-item">
                            <div className="report-item-header">
                              <span>Citizen Reporter</span>
                              <span>{new Date(selectedComplaint.createdAt).toLocaleString()}</span>
                            </div>
                            <p>{selectedComplaint.description}</p>
                          </div>
                        ) : (
                          drawerReports.map(rep => {
                            const repImgSrc = rep.image ? (rep.image.startsWith("http") ? rep.image : `${MEDIA_URL}/${rep.image}`) : null;
                            return (
                              <div key={rep._id || rep.id} className="report-item">
                                <div className="report-item-header">
                                  <span>👤 {rep.userName || "Anonymous"} ({rep.userPhone || "Not provided"})</span>
                                  <span>{new Date(rep.createdAt).toLocaleString()}</span>
                                </div>
                                <p>{rep.description}</p>
                                {repImgSrc && (
                                  <span 
                                    style={{ fontSize: "11px", color: "var(--metro-blue)", cursor: "pointer", display: "inline-block", marginTop: "6px" }}
                                    onClick={() => setModalImage(repImgSrc)}
                                  >
                                    🖼️ View uploaded file attachment
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Action Logs */}
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

                    {/* Update Status Actions */}
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
          )
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
                <div style={{ height: "60px" }} />
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
                        <div style={{ display: "flex", justifycontent: "space-between", marginBottom: "4px" }}>
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
