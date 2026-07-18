import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { analyzeDescription } from "./nlpProcessor.js";
import { findDuplicateComplaint } from "./duplicateDetector.js";
import {
  getComplaints,
  getComplaintReports,
  insertComplaint,
  mergeDuplicateReport,
  updateComplaintStatus
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Set up upload directory
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Serve uploaded/static files
app.use("/uploads", express.static(UPLOAD_DIR));

// Create mock seed SVG files if they don't exist
const SEED_IMAGES = {
  "seed_sewage_1.jpg": `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1a1c23"/>
    <circle cx="400" cy="300" r="180" fill="#2d303f"/>
    <path d="M 300 450 Q 400 350 500 450 T 700 450" stroke="#4ade80" stroke-width="8" fill="none" opacity="0.3"/>
    <path d="M 200 400 Q 350 250 500 400 T 800 400" stroke="#34d399" stroke-width="12" fill="none" opacity="0.5"/>
    <path d="M 100 480 Q 300 380 500 480 T 900 480" stroke="#059669" stroke-width="20" fill="none"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="32" fill="#34d399" font-weight="600">SEWAGE LEAKAGE &amp; WATERLOGGING</text>
    <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-size="18" fill="#9ca3af">Delhi Civic Service Navigator - Archive Photo</text>
  </svg>`,
  "seed_sewage_2.jpg": `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111827"/>
    <path d="M 0 500 Q 200 400 400 500 T 800 500" fill="#047857"/>
    <rect x="250" y="200" width="300" height="180" rx="15" fill="#1f2937" stroke="#059669" stroke-width="4"/>
    <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="28" fill="#a7f3d0" font-weight="500">MCD Drainage Incident</text>
    <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-size="16" fill="#6b7280">Outer Ring Rd, Munirka</text>
  </svg>`,
  "seed_lights_1.jpg": `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#090d16"/>
    <circle cx="400" cy="180" r="100" fill="#1f2937"/>
    <circle cx="400" cy="180" r="80" fill="#111827"/>
    <path d="M 400 0 L 400 100 M 350 50 L 450 50" stroke="#374151" stroke-width="6"/>
    <path d="M 400 280 L 400 600" stroke="#374151" stroke-width="12"/>
    <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="32" fill="#fbbf24" font-weight="600" opacity="0.3">OUTAGE: STREET LIGHTS BROKEN</text>
    <text x="50%" y="73%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-size="18" fill="#4b5563">Janakpuri District Center Area</text>
  </svg>`,
  "seed_garbage_1.jpg": `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1b1c20"/>
    <circle cx="400" cy="280" r="140" fill="#24252d"/>
    <path d="M 330 330 L 350 210 L 450 210 L 470 330 Z" fill="#4b5563" opacity="0.5"/>
    <path d="M 310 180 L 490 180" stroke="#9ca3af" stroke-width="8"/>
    <rect x="360" y="230" width="20" height="70" rx="3" fill="#1f2937"/>
    <rect x="420" y="230" width="20" height="70" rx="3" fill="#1f2937"/>
    <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="32" fill="#f87171" font-weight="600">GARBAGE ACCUMULATION</text>
    <text x="50%" y="73%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-size="18" fill="#6b7280">Sector 8 Rohini Depot Zone</text>
  </svg>`,
  "seed_sparks_1.jpg": `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#110708"/>
    <polygon points="400,100 300,320 380,320 350,500 500,280 420,280" fill="#f59e0b" opacity="0.25"/>
    <polygon points="400,150 320,330 390,330 360,460 470,300 410,300" fill="#ef4444"/>
    <text x="50%" y="82%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="32" fill="#f3f4f6" font-weight="700">DANGER: TRANSFomer sparks</text>
    <text x="50%" y="89%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-size="18" fill="#b91c1c" font-weight="600">URGENT RESOLUTION LOGGED</text>
  </svg>`,
  "seed_vendors_1.jpg": `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0f172a"/>
    <rect x="150" y="450" width="500" height="150" fill="#334155"/>
    <circle cx="280" cy="350" r="60" fill="#e2e8f0" opacity="0.15"/>
    <path d="M 220 350 L 340 350" stroke="#f43f5e" stroke-width="4"/>
    <path d="M 280 290 L 280 410" stroke="#f43f5e" stroke-width="4"/>
    <text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="32" fill="#38bdf8" font-weight="600">ILLEGAL ENCROACHMENT ACTIVE</text>
    <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-size="18" fill="#94a3b8">Lajpat Nagar Central Market Drive</text>
  </svg>`
};

Object.entries(SEED_IMAGES).forEach(([filename, svgContent]) => {
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, svgContent);
  }
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// API Endpoints

// 1. Get all complaints
app.get("/api/complaints", (req, res) => {
  try {
    const complaints = getComplaints();
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve complaints." });
  }
});

// 2. Get reports associated with a complaint (history/duplicates)
app.get("/api/complaints/:id/reports", (req, res) => {
  try {
    const reports = getComplaintReports(req.params.id);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve linked reports." });
  }
});

// 3. Create or Merge a Complaint (Citizen Portal Submission)
app.post("/api/complaints", upload.single("image"), (req, res) => {
  try {
    const { description, userName, userPhone, locationOverride } = req.body;
    
    if (!description || description.trim() === "") {
      return res.status(400).json({ error: "Description is required." });
    }

    const imageFilename = req.file ? req.file.filename : null;

    // AI/NLP processing
    const nlpData = analyzeDescription(description);

    // If user provided a location manual override, use it instead of AI extraction
    if (locationOverride && locationOverride.trim() !== "") {
      nlpData.location = locationOverride.trim();
    }

    // Get active complaints to check for duplicates
    const activeComplaints = getComplaints();

    // Check for duplicates
    const duplicateMatch = findDuplicateComplaint({
      description,
      category: nlpData.category,
      location: nlpData.location
    }, activeComplaints);

    if (duplicateMatch) {
      // Merge report with existing complaint
      const matchedComplaint = duplicateMatch.complaint;
      const mergeResult = mergeDuplicateReport(matchedComplaint.id, {
        description,
        image: imageFilename,
        userName,
        userPhone
      });

      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: `We identified this issue is already reported at ${matchedComplaint.location}. We have merged your report with the existing complaint to prioritize it.`,
        complaint: mergeResult.complaint,
        report: mergeResult.report
      });
    } else {
      // Create new complaint
      const newComplaintData = {
        title: nlpData.title,
        category: nlpData.category,
        department: nlpData.department,
        severity: nlpData.severity,
        location: nlpData.location,
        description,
        image: imageFilename,
        userName,
        userPhone
      };

      const result = insertComplaint(newComplaintData);

      return res.status(201).json({
        success: true,
        isDuplicate: false,
        message: "Your complaint has been successfully registered and routed to the department.",
        complaint: result.complaint,
        report: result.report
      });
    }
  } catch (error) {
    console.error("Error creating/merging complaint:", error);
    res.status(500).json({ error: "Failed to submit complaint. Please try again." });
  }
});

// 4. Update complaint status (Department Dashboard Action)
app.patch("/api/complaints/:id/status", (req, res) => {
  try {
    const { status, note } = req.body;
    
    if (!["Pending", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const updatedComplaint = updateComplaintStatus(req.params.id, status, note);
    if (!updatedComplaint) {
      return res.status(404).json({ error: "Complaint not found." });
    }

    res.json({
      success: true,
      message: `Complaint status updated to ${status}.`,
      complaint: updatedComplaint
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update complaint status." });
  }
});

// 5. Endpoint to run direct NLP analysis on-the-fly (useful for interactive UI feedback!)
app.post("/api/analyze-test", (req, res) => {
  try {
    const { description } = req.body;
    const analysis = analyzeDescription(description);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: "Failed to analyze description." });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`Delhi Civic Service Navigator Backend listening on port ${PORT}`);
});
