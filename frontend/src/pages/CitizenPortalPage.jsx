import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useComplaints } from "../hooks/useComplaints";
import { useGeolocation } from "../hooks/useGeolocation";
import { CitizenAuth } from "../components/citizen/CitizenAuth";
import { ComplaintForm } from "../components/citizen/ComplaintForm";
import { MyComplaintsList } from "../components/citizen/MyComplaintsList";
import { NearbyComplaints } from "../components/citizen/NearbyComplaints";
import { fetchMyComplaints, fetchNearbyComplaints } from "../services/api";

export function CitizenPortalPage({ onImageClick }) {
  const { user, token, authMode, setAuthMode, authName, setAuthName, authPhone, setAuthPhone, authPassword, setAuthPassword, authError, authLoading, loginCitizen, signupCitizen } = useAuth();
  const { complaints, loadComplaints } = useComplaints();
  const { coords, setCoords, detectLocation } = useGeolocation();

  const [subView, setSubView] = useState("report"); // report, list
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [nearbyComplaints, setNearbyComplaints] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);

  // Load citizen's personal complaints feed
  const loadMyFeed = async () => {
    if (!token) return;
    setLoadingMy(true);
    try {
      const data = await fetchMyComplaints(token);
      setMyComplaints(data || []);
    } catch (err) {
      console.warn("Failed to load citizen issues:", err.message);
    } finally {
      setLoadingMy(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      loadMyFeed();
    }
  }, [user, token, complaints]);

  // Dynamically load nearby complaints as soon as GPS coords update
  useEffect(() => {
    const loadNearby = async () => {
      setLoadingNearby(true);
      try {
        const data = await fetchNearbyComplaints(coords.lat, coords.lng, 1.5);
        setNearbyComplaints(data || []);
      } catch (err) {
        console.warn("Failed to load nearby complaints:", err.message);
      } finally {
        setLoadingNearby(false);
      }
    };

    loadNearby();
  }, [coords, complaints]);

  if (!user) {
    return (
      <CitizenAuth
        authMode={authMode || "login"}
        setAuthMode={setAuthMode}
        authName={authName}
        setAuthName={setAuthName}
        authPhone={authPhone}
        setAuthPhone={setAuthPhone}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authError={authError}
        authLoading={authLoading}
        onLogin={loginCitizen}
        onSignup={signupCitizen}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Profile Bar */}
      <div className="profile-bar">
        <div className="profile-avatar-group">
          <div className="profile-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
              Connected Citizen: {user.name}
            </strong>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              📞 Phone ID: {user.phone} &bull; 📍 GPS Coords: {coords.lat}, {coords.lng}
            </div>
          </div>
        </div>

        <div className="flex-gap">
          <button
            className={`btn-secondary ${subView === "report" ? "active" : ""}`}
            onClick={() => setSubView("report")}
            style={{ fontSize: "13px", padding: "8px 16px" }}
          >
            📢 Report Civic Issue
          </button>
          <button
            className={`btn-secondary ${subView === "list" ? "active" : ""}`}
            onClick={() => {
              setSubView("list");
              loadMyFeed();
            }}
            style={{ fontSize: "13px", padding: "8px 16px" }}
          >
            📂 My Reported Issues ({myComplaints.length})
          </button>
        </div>
      </div>

      {subView === "report" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px" }}>
          <ComplaintForm
            token={token}
            user={user}
            initialCoords={coords}
            onCoordsChange={setCoords}
            onComplaintSubmitted={() => {
              loadMyFeed();
              loadComplaints();
            }}
          />
          <NearbyComplaints
            nearbyComplaints={nearbyComplaints}
            loadingNearby={loadingNearby}
            onImageClick={onImageClick}
          />
        </div>
      ) : (
        <MyComplaintsList
          myComplaints={myComplaints}
          loading={loadingMy}
          onImageClick={onImageClick}
        />
      )}
    </div>
  );
}
