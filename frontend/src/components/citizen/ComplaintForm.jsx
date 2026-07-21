import React, { useState, useEffect, useRef } from "react";
import { analyzeDescriptionTest, submitComplaint } from "../../services/api";

export function ComplaintForm({ token, user, initialCoords, onCoordsChange, onComplaintSubmitted }) {
  const [description, setDescription] = useState("");
  const [locationOverride, setLocationOverride] = useState("");
  const [latitude, setLatitude] = useState(initialCoords?.lat || 28.6139);
  const [longitude, setLongitude] = useState(initialCoords?.lng || 77.2090);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const pickerMarkerRef = useRef(null);

  useEffect(() => {
    if (initialCoords && initialCoords.lat && initialCoords.lng) {
      setLatitude(initialCoords.lat);
      setLongitude(initialCoords.lng);
    }
  }, [initialCoords]);

  // Dynamic AI analysis preview
  useEffect(() => {
    if (description.trim().length < 15) {
      setAiSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await analyzeDescriptionTest(description);
        setAiSuggestion(data);
      } catch (err) {
        // silent fallback
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [description]);

  // Leaflet Map Picker Initialization
  useEffect(() => {
    if (submitResult) return;

    const timer = setTimeout(() => {
      if (!window.L) return;

      if (window.pickerMap) {
        try {
          window.pickerMap.remove();
        } catch (e) {
          // ignore
        }
        window.pickerMap = null;
      }

      const mapContainer = document.getElementById("map-picker");
      if (!mapContainer) return;

      try {
        const map = window.L.map("map-picker").setView([latitude, longitude], 13);
        window.pickerMap = map;

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        const marker = window.L.marker([latitude, longitude], { draggable: true }).addTo(map);
        pickerMarkerRef.current = marker;

        const updateCoords = (newLat, newLng) => {
          setLatitude(newLat);
          setLongitude(newLng);
          if (onCoordsChange) onCoordsChange({ lat: newLat, lng: newLng });
        };

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          updateCoords(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
        });

        map.on("click", (e) => {
          marker.setLatLng(e.latlng);
          updateCoords(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
        });
      } catch (err) {
        console.error("Leaflet picker map creation error:", err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [submitResult, latitude, longitude, onCoordsChange]);

  const handleGPSDetect = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        if (onCoordsChange) onCoordsChange({ lat, lng });

        if (window.pickerMap && pickerMarkerRef.current) {
          window.pickerMap.setView([lat, lng], 14);
          pickerMarkerRef.current.setLatLng([lat, lng]);
        }
      },
      (err) => {
        alert(`Location detection failed: ${err.message}`);
      }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg("Please describe the civic issue.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("description", description);
      formData.append("locationOverride", locationOverride);
      formData.append("latitude", latitude.toString());
      formData.append("longitude", longitude.toString());
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await submitComplaint(formData, token);
      setSubmitResult(res);
      if (onComplaintSubmitted) {
        onComplaintSubmitted(res);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setDescription("");
    setLocationOverride("");
    setImageFile(null);
    setImagePreview(null);
    setAiSuggestion(null);
    setSubmitResult(null);
    setErrorMsg("");
  };

  if (submitResult) {
    return (
      <div className="glass-card" style={{ textAlign: "center", padding: "36px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>
          {submitResult.isDuplicate ? "⚡" : "🎉"}
        </div>
        <h2 style={{ fontSize: "22px", fontFamily: "var(--font-display)", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
          {submitResult.isDuplicate ? "Report Consolidated with Active Issue" : "Civic Issue Successfully Registered!"}
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: "1.6" }}>
          {submitResult.message}
        </p>

        {submitResult.complaint && (
          <div className="ai-report-box" style={{ textAlign: "left", marginBottom: "24px" }}>
            <div className="ai-report-meta">
              <div className="ai-meta-item">
                <span className="ai-meta-label">Category</span>
                <span className="ai-meta-val" style={{ color: "var(--elastic-blue)" }}>{submitResult.complaint.category}</span>
              </div>
              <div className="ai-meta-item">
                <span className="ai-meta-label">Routed Department</span>
                <span className="ai-meta-val">{submitResult.complaint.department}</span>
              </div>
              <div className="ai-meta-item">
                <span className="ai-meta-label">Priority Level</span>
                <span className="ai-meta-val">{submitResult.complaint.priorityLevel} ({submitResult.complaint.priority}%)</span>
              </div>
              <div className="ai-meta-item">
                <span className="ai-meta-label">Merged Reports</span>
                <span className="ai-meta-val">{submitResult.complaint.reportCount} submissions</span>
              </div>
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={handleResetForm}>
          ➕ Report Another Issue
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <h2 style={{ fontSize: "20px", fontFamily: "var(--font-display)", fontWeight: "800", marginBottom: "6px" }}>
        📢 Log a New Civic Grievance
      </h2>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
        Our NLP router classifies your report, extracts location tags, and checks active issues nearby to elevate priority.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Issue Description *</label>
          <textarea
            placeholder="Describe the issue in detail (e.g. Large pothole on Outer Ring Road near Janakpuri causing traffic hazards...)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Live AI Routing Feedback Preview */}
        {aiSuggestion && (
          <div className="ai-report-box" style={{ marginBottom: "20px", borderLeft: "4px solid var(--elastic-teal)" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--elastic-teal)", marginBottom: "8px", textTransform: "uppercase" }}>
              🤖 AI Real-Time Analysis Preview
            </div>
            <div className="ai-report-meta">
              <div className="ai-meta-item">
                <span className="ai-meta-label">Detected Category</span>
                <span className="ai-meta-val" style={{ color: "var(--elastic-blue)" }}>{aiSuggestion.category}</span>
              </div>
              <div className="ai-meta-item">
                <span className="ai-meta-label">Assigned Department</span>
                <span className="ai-meta-val">{aiSuggestion.department}</span>
              </div>
              <div className="ai-meta-item">
                <span className="ai-meta-label">Assessed Severity</span>
                <span className="ai-meta-val">{aiSuggestion.severity}</span>
              </div>
              <div className="ai-meta-item">
                <span className="ai-meta-label">Extracted Landmark</span>
                <span className="ai-meta-val">{aiSuggestion.location || "Auto Pin Location"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label style={{ margin: 0 }}>Pinpoint Location on Map *</label>
            <button
              type="button"
              className="btn-outline"
              onClick={handleGPSDetect}
              style={{ padding: "4px 12px", fontSize: "12px" }}
            >
              📍 GPS My Location
            </button>
          </div>

          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
            Drag pin or click map to adjust. Selected Coords: <strong>{latitude}</strong>, <strong>{longitude}</strong>
          </div>

          <div id="map-picker" className="map-container"></div>
        </div>

        <div className="form-group">
          <label>Location Landmark / Address (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Near Metro Pillar 42, Outer Ring Road, Janakpuri"
            value={locationOverride}
            onChange={(e) => setLocationOverride(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Photo Evidence (Optional)</label>
          <div className="dropzone" onClick={() => document.getElementById("file-input").click()}>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageChange}
            />
            <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>📸</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              {imageFile ? imageFile.name : "Click or drag photo to upload"}
            </span>
          </div>

          {imagePreview && (
            <div className="dropzone-preview">
              <img src={imagePreview} alt="Upload preview" />
            </div>
          )}
        </div>

        {errorMsg && (
          <p style={{ color: "var(--metro-red)", fontSize: "13px", marginBottom: "16px" }}>
            ⚠️ {errorMsg}
          </p>
        )}

        <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? "Analyzing & Submitting Grievance..." : "🚀 Submit Complaint"}
        </button>
      </form>
    </div>
  );
}
