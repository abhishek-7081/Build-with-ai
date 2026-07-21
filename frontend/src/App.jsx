import React, { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ComplaintsProvider } from "./context/ComplaintsContext";
import { Header } from "./components/common/Header";
import { ImageModal } from "./components/common/ImageModal";
import { CitizenPortalPage } from "./pages/CitizenPortalPage";
import { DepartmentDashboardPage } from "./pages/DepartmentDashboardPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

function AppContent() {
  const [activeTab, setActiveTab] = useState("portal"); // portal, dashboard, analytics
  const [modalImage, setModalImage] = useState(null);

  return (
    <div className="app-container">
      {/* Header bar */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Container */}
      <main className="main-content">
        {activeTab === "portal" && (
          <CitizenPortalPage onImageClick={setModalImage} />
        )}

        {activeTab === "dashboard" && (
          <DepartmentDashboardPage onImageClick={setModalImage} />
        )}

        {activeTab === "analytics" && (
          <AnalyticsPage onImageClick={setModalImage} />
        )}
      </main>

      {/* Full Resolution Image Viewer Modal */}
      <ImageModal imgSrc={modalImage} onClose={() => setModalImage(null)} />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ComplaintsProvider>
        <AppContent />
      </ComplaintsProvider>
    </AuthProvider>
  );
}

export default App;
