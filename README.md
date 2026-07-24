# Delhi Civic Service Navigator

The **Delhi Civic Service Navigator** is an intelligent, full-stack civic issue reporting and routing web application. It enables Delhi citizens to report and track municipal grievances (like sewage leakage, potholes, and broken street lights) while providing government departments (MCD, PWD, DJB, etc.) with dedicated gateways, interactive geographic maps, automatic duplicate detection, and dynamic priority tracking.

---

## 🚀 Key Features

### 1. Citizen Portal

- **JWT User Authentication**: Secure registration and sign-in. Protects citizen profiles and enables secure tracking.
- **Personal Submission Feed**: A "My Reported Issues" view lists all complaints submitted by the authenticated citizen.
- **Leaflet Map Picker**: Citizens can pinpoint issue coordinates by dragging a map pin marker or clicking on the map.
- **HTML5 Geolocation API**: Automatic coordinate capture via a "GPS My Location" detector.
- **Drag-and-Drop Image Upload**: Live file previews before uploading.

### 2. Backend Intelligence & AI Routing

- **AI NLP Classification**: Heuristic parsing reads descriptions to classify reports into 16 categories, routing them to the correct government department.
- **Duplicate Submission Shield**: Evaluates text similarity (Jaccard Coefficient) and proximity coordinates of active reports to detect duplicates. If a match is found, the reports are consolidated under a single complaint, combining photos and raising the priority score.
- **Vicinity Proximity Booster**: Dynamic priority score (0-100) boosts issues situated in "hotspots" (within 1km of other active complaints) by up to +25 points.

### 3. Department Gateways Dashboard

- **Isolated Sub-Portals**: Custom landing page routes officials to MCD, PWD, DJB, Traffic Police, or DISCOM gateways with tailored branding and automatically filtered views.
- **Delhi Metro Design Theme**: CSS styled in a premium dark mode, utilizing color palettes inspired by Delhi Metro lines (Yellow, Blue, Violet, Red, Green).
- **Hotspot Master Map**: Leaflet.js dashboard map plots active complaints. Merge hotspots are highlighted in crimson markers. Clicking markers opens details.
- **Inspection Drawer**: Detailed panel displaying photo galleries, structured summaries, status milestone logs, and a lists of merged citizen descriptions.

### 4. Live Analytics

- KPI cards show active totals, duplicates blocked, and resolution rates.
- Visual bar charts show category distributions and agency performance rates.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), JavaScript, Vanilla CSS (Glassmorphism, custom animations), Leaflet.js
- **Backend**: Node.js, Express.js, Multer
- **Database**: MongoDB (using Mongoose ODM)
- **Cloud Storage**: Cloudinary (with local disk fallback for uploads)
- **Security & Auth**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs` for password hashing

---

## 📁 Directory Structure

```
/delhi-civic-navigator
  ├── backend/
  │    ├── models/
  │    │    ├── User.js            # Mongoose Citizen schema
  │    │    └── Complaint.js       # Mongoose Complaint schema
  │    ├── uploads/                # Local temp image uploads folder
  │    ├── data/                   # System assets
  │    ├── nlpProcessor.js         # Keyword & NLP processing
  │    ├── duplicateDetector.js    # Jaccard similarity matcher
  │    ├── db.js                   # Mongoose connection & seeding script
  │    ├── server.js               # Express API and routes
  │    └── test_ai.js              # NLP & similarity unit tests
  │
  ├── frontend/
  │    ├── src/
  │    │    ├── App.jsx            # Core React view coordinator
  │    │    ├── main.jsx           # React app mount script
  │    │    └── index.css          # Design system stylesheet
  │    ├── index.html              # Leaflet CDN imports
  │    └── vite.config.js          # Vite config
  │
  ├── start-app.bat                # Windows double-click server runner
  └── package.json                 # Project manager
```

---

## ⚙️ Installation & Configuration

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) running locally on `mongodb://localhost:27017`

### 1. Environment Configurations

Create `.env` files in both backend and frontend directories:

- **Backend Environment Variables (`backend/.env`):**

  ```env
  PORT=5000
  MONGODB_URI=mongodb://localhost:27017/delhi_civic_navigator
  JWT_SECRET=delhi_civic_security_secret_token_12345

  # Cloudinary config (Optional: leaves blank for local uploads fallback)
  CLOUDINARY_CLOUD_NAME=
  CLOUDINARY_API_KEY=
  CLOUDINARY_API_SECRET=
  ```

- **Frontend Environment Variables (`frontend/.env`):**
  ```env
  VITE_API_URL=http://localhost:5000/api
  ```

### 2. Dependency Installation

Run the root-level install script to download dependencies for both packages:

```bash
npm run install:all
```

---

## 🚀 Running the Application

### Windows (Quick Start)

1. Double-click the **`start-app.bat`** file in the root workspace folder.
2. It will open two separate command prompt windows running the backend server on `http://localhost:5000` and the frontend server on `http://localhost:5173`.
3. Open your browser and navigate to **`http://localhost:5173`**.

### Manual Terminals

If you want to launch the servers manually:

- **Backend Terminal:**
  ```bash
  cd backend
  npm run dev
  ```
- **Frontend Terminal:**
  ```bash
  cd frontend
  npm run dev
  ```

---

## 🔑 Demo Citizen Credentials

On startup, the system seeds a default citizen account for test logins:

- **Phone**: `9810123456`
- **Password**: `password123`

---

## 🧪 Running Backend Heuristic Tests

You can run automated tests checking the NLP categorization, location extraction, and duplicate detection:

```bash
cd backend
node test_ai.js
```
