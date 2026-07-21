import React, { useState } from "react";
import { Header } from "./components/common/Header";
import { ImageModal } from "./components/common/ImageModal";
import { CitizenPortalPage } from "./pages/CitizenPortalPage";
import { DepartmentDashboardPage } from "./pages/DepartmentDashboardPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { useAuth } from "./hooks/useAuth";
import { useComplaints } from "./hooks/useComplaints";

export function App() {
  const [activeTab, setActiveTab] = useState("portal"); // portal, dashboard, analytics
  const [modalImage, setModalImage] = useState(null);

  const auth = useAuth();
  const complaintsState = useComplaints();

  return (
    <div className="app-container">
      {/* Header bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={auth.user}
        onLogout={auth.logout}
      />

      {/* Main View Container */}
      <main className="main-content">
        {activeTab === "portal" && (
          <CitizenPortalPage
            auth={auth}
            complaints={complaintsState.complaints}
            onUpdateComplaints={complaintsState.loadComplaints}
            onImageClick={setModalImage}
          />
        )}

        {activeTab === "dashboard" && (
          <DepartmentDashboardPage
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
            onImageClick={setModalImage}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsPage complaints={complaintsState.complaints} />
        )}
      </main>

      {/* Full Resolution Image Viewer Modal */}
      <ImageModal imgSrc={modalImage} onClose={() => setModalImage(null)} />
    </div>
  );
}

export default App;
