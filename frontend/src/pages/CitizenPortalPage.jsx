import React, { useState, useEffect } from "react";
import { CitizenAuth } from "../components/citizen/CitizenAuth";
import { ComplaintForm } from "../components/citizen/ComplaintForm";
import { MyComplaintsList } from "../components/citizen/MyComplaintsList";
import { NearbyComplaints } from "../components/citizen/NearbyComplaints";
import { fetchMyComplaints, fetchNearbyComplaints } from "../services/api";

export function CitizenPortalPage({ auth, complaints, onUpdateComplaints, onImageClick }) {
  const [subView, setSubView] = useState("report"); // report, list
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [nearbyComplaints, setNearbyComplaints] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);

  // Load citizen's personal complaints feed
  const loadMyComplaints = async () => {
    if (!auth.token) return;
    setLoadingMy(true);
    try {
      const data = await fetchMyComplaints(auth.token);
      setMyComplaints(data || []);
    } catch (err) {
      console.warn("Failed to load citizen issues:", err);
    } finally {
      setLoadingMy(false);
    }
  };

  useEffect(() => {
    if (auth.user && auth.token) {
      loadMyComplaints();
    }
  }, [auth.user, auth.token, complaints]);

  // Load nearby complaints around center coords (28.6139, 77.2090)
  useEffect(() => {
    const loadNearby = async () => {
      setLoadingNearby(true);
      try {
        const data = await fetchNearbyComplaints(28.6139, 77.2090, 1.5);
        setNearbyComplaints(data || []);
      } catch (err) {
        console.warn("Failed to load nearby complaints:", err);
      } finally {
        setLoadingNearby(false);
      }
    };
    loadNearby();
  }, [complaints]);

  if (!auth.user) {
    return (
      <CitizenAuth
        authMode={auth.authMode}
        setAuthMode={auth.setAuthMode}
        authName={auth.authName}
        setAuthName={auth.setAuthName}
        authPhone={auth.authPhone}
        setAuthPhone={auth.setAuthPhone}
        authPassword={auth.authPassword}
        setAuthPassword={auth.setAuthPassword}
        authError={auth.authError}
        authLoading={auth.authLoading}
        onLogin={auth.login}
        onSignup={auth.signup}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Profile Bar / Navigation Header */}
      <div className="profile-bar">
        <div className="profile-avatar-group">
          <div className="profile-avatar">
            {auth.user.name ? auth.user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
              Connected Citizen: {auth.user.name}
            </strong>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              📞 Phone ID: {auth.user.phone}
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
              loadMyComplaints();
            }}
            style={{ fontSize: "13px", padding: "8px 16px" }}
          >
            📂 My Reported Issues ({myComplaints.length})
          </button>
        </div>
      </div>

      {subView === "report" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px" }}>
          <ComplaintForm
            token={auth.token}
            user={auth.user}
            onComplaintSubmitted={() => {
              loadMyComplaints();
              if (onUpdateComplaints) onUpdateComplaints();
            }}
          />
          <NearbyComplaints
            nearbyComplaints={nearbyComplaints}
            loadingNearby={loadingNearby}
            user={auth.user}
            token={auth.token}
            onUpdateComplaints={onUpdateComplaints}
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
