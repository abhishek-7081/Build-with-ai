import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

import { connectDatabase } from "./config/db.js";
import { connectElasticsearch } from "./services/elasticService.js";
import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { getCitizenComplaints } from "./controllers/complaintController.js";
import { authenticateToken } from "./middlewares/authMiddleware.js";
import { analyzeDescription, processProblemSubmission } from "./services/aiRouterService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Establish connections
connectDatabase();
connectElasticsearch();

// Configure Cloudinary if credentials provided
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log("Cloudinary cloud storage initialized.");
} else {
  console.log("Cloudinary credentials missing in .env. Falling back to local storage in /uploads");
}

// Serve uploaded/static assets locally
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOAD_DIR));

// Seed SVG mock assets if missing
const SEED_IMAGES = {
  "seed_sewage_1.jpg": `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1a1c23"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="32" fill="#34d399" font-weight="600">SEWAGE LEAKAGE &amp; WATERLOGGING</text>
  </svg>`,
  "seed_sewage_2.jpg": `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111827"/>
    <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="28" fill="#a7f3d0" font-weight="500">MCD Drainage Incident</text>
  </svg>`,
  "seed_lights_1.jpg": `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#090d16"/>
    <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="32" fill="#fbbf24" font-weight="600">OUTAGE: STREET LIGHTS BROKEN</text>
  </svg>`,
  "seed_garbage_1.jpg": `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1b1c20"/>
    <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="32" fill="#f87171" font-weight="600">GARBAGE ACCUMULATION</text>
  </svg>`
};

Object.entries(SEED_IMAGES).forEach(([filename, svgContent]) => {
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, svgContent);
  }
});

// --- MOUNT ROUTERS ---
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/analytics", analyticsRoutes);

// Direct Route Alignments for Citizen Feed
app.get("/api/citizen/my-complaints", authenticateToken, getCitizenComplaints);

// Functiondisc Compatible API Endpoint
app.post("/api/submit-problem", async (req, res) => {
  try {
    const result = await processProblemSubmission(req.body || {});
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
});

// AI analysis interactive testing endpoint
app.post("/api/analyze-test", async (req, res) => {
  try {
    const { description } = req.body;
    const analysis = await analyzeDescription(description);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: "Failed to run analysis." });
  }
});

app.get("/api/config", (req, res) => {
  res.json({
    kibanaDashboardUrl: process.env.KIBANA_DASHBOARD_URL || "",
    kibanaMapsUrl: process.env.KIBANA_MAPS_URL || ""
  });
});

app.listen(PORT, () => {
  console.log(`Delhi Civic Service Navigator Backend listening on port ${PORT}`);
});
