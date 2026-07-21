import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

import { 
  connectDatabase, 
  queryComplaints, 
  calculatePriorityScore, 
  getPriorityLevel,
  isDbConnected,
  memoryStore
} from "./db.js";
import { analyzeDescription, processProblemSubmission } from "./services/aiRouterService.js";
import { findDuplicateComplaint } from "./services/duplicateDetector.js";
import { 
  connectElasticsearch, 
  indexComplaint, 
  deleteComplaint, 
  searchNearbyComplaints, 
  findSimilarElasticComplaints 
} from "./services/elasticService.js";
import { User } from "./models/User.js";
import { Complaint } from "./models/Complaint.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect database and search index
connectDatabase();
connectElasticsearch();

// Configure Cloudinary if credentials provided
let useCloudinary = false;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  useCloudinary = true;
  console.log("Cloudinary cloud storage initialized.");
} else {
  console.log("Cloudinary credentials missing in .env. Falling back to local storage in /uploads");
}

// Local uploads directory fallback
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOAD_DIR));

// Seed SVG mock assets if missing
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

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// AUTH MIDDLEWARE
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access denied. Authentication required to report issues." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || "delhi_civic_security_secret_token_12345");
    req.userId = verified.userId;
    req.userName = verified.name;
    req.userPhone = verified.phone;
    next();
  } catch (err) {
    res.status(403).json({ error: "Session expired. Please log in again." });
  }
}

function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET || "delhi_civic_security_secret_token_12345");
      req.userId = verified.userId;
      req.userName = verified.name;
      req.userPhone = verified.phone;
    } catch (err) {
      console.warn("Optional auth token invalid or expired, proceeding as anonymous:", err.message);
    }
  }
  next();
}

// --- API ROUTES ---

// 1. Functiondisc Integrated Compatibility Endpoint (/api/submit-problem)
app.post("/api/submit-problem", async (req, res) => {
  try {
    const result = await processProblemSubmission(req.body || {});
    res.status(200).json(result);
  } catch (error) {
    console.error("Functiondisc endpoint processing error:", error.message);
    res.status(400).json({ status: "error", message: error.message });
  }
});

// 2. Auth Endpoints
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: "All fields (name, phone, password) are required." });
    }

    if (isDbConnected()) {
      const existing = await User.findOne({ phone });
      if (existing) {
        return res.status(400).json({ error: "This phone number is already registered. Please log in." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ name, phone, password: hashedPassword });
      const savedUser = await newUser.save();

      const token = jwt.sign(
        { userId: savedUser._id, name: savedUser.name, phone: savedUser.phone },
        process.env.JWT_SECRET || "delhi_civic_security_secret_token_12345",
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        success: true,
        token,
        user: { id: savedUser._id, name: savedUser.name, phone: savedUser.phone }
      });
    } else {
      // Memory Store Fallback
      const existing = memoryStore.users.find(u => u.phone === phone);
      if (existing) {
        return res.status(400).json({ error: "This phone number is already registered. Please log in." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUserId = "user_" + Date.now();
      const newUser = { _id: newUserId, id: newUserId, name, phone, password: hashedPassword };
      memoryStore.users.push(newUser);

      const token = jwt.sign(
        { userId: newUserId, name, phone },
        process.env.JWT_SECRET || "delhi_civic_security_secret_token_12345",
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        success: true,
        token,
        user: { id: newUserId, name, phone }
      });
    }
  } catch (error) {
    console.error("Signup failed:", error);
    res.status(500).json({ error: "Registration failed. Try again." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: "Phone and password are required." });
    }

    let user = null;
    if (isDbConnected()) {
      user = await User.findOne({ phone });
    } else {
      user = memoryStore.users.find(u => u.phone === phone);
    }

    if (!user) {
      return res.status(400).json({ error: "Invalid phone number or password." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid phone number or password." });
    }

    const token = jwt.sign(
      { userId: user._id || user.id, name: user.name, phone: user.phone },
      process.env.JWT_SECRET || "delhi_civic_security_secret_token_12345",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id || user.id, name: user.name, phone: user.phone }
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: "Login failed. Try again." });
  }
});

// 3. Complaints Endpoints
app.get("/api/complaints", async (req, res) => {
  try {
    const complaints = await queryComplaints();
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve complaints." });
  }
});

app.get("/api/citizen/my-complaints", authenticateToken, async (req, res) => {
  try {
    if (isDbConnected()) {
      const myIssues = await Complaint.find({ "reports.userId": req.userId }).sort({ updatedAt: -1 });
      return res.json(myIssues);
    } else {
      const myIssues = memoryStore.complaints.filter(c =>
        c.reports && c.reports.some(r => r.userId && r.userId.toString() === req.userId.toString())
      );
      return res.json(myIssues);
    }
  } catch (error) {
    console.error("Failed to query citizen issues:", error);
    res.status(500).json({ error: "Failed to load your complaints." });
  }
});

app.get("/api/complaints/:id/reports", async (req, res) => {
  try {
    if (isDbConnected()) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found" });
      return res.json(complaint.reports);
    } else {
      const complaint = memoryStore.complaints.find(c => (c._id || c.id) === req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found" });
      return res.json(complaint.reports || []);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve reports." });
  }
});

app.post("/api/complaints", optionalAuthenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { description, locationOverride, latitude, longitude } = req.body;
    if (!description || description.trim() === "") {
      return res.status(400).json({ error: "Description is required." });
    }

    const reporterId = req.userId || null;
    const reporterName = req.userName || req.body.userName || "Anonymous Citizen";
    const reporterPhone = req.userPhone || req.body.userPhone || "Not provided";

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const locationCoords = {
      lat: !isNaN(latNum) ? latNum : 28.6139,
      lng: !isNaN(lngNum) ? lngNum : 77.2090
    };

    let imageUri = null;
    if (req.file) {
      if (useCloudinary) {
        try {
          const cloudResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "delhi_civic_navigator"
          });
          imageUri = cloudResult.secure_url;
        } catch (uploadError) {
          console.error("Cloudinary upload failed, using local disk fallback:", uploadError);
          imageUri = req.file.filename;
        }
      } else {
        imageUri = req.file.filename;
      }
    }

    const nlpData = await analyzeDescription(description);
    if (locationOverride && locationOverride.trim() !== "") {
      nlpData.location = locationOverride.trim();
    }

    let duplicateMatch = null;
    try {
      const similarHits = await findSimilarElasticComplaints(description, locationCoords.lat, locationCoords.lng, 1.0);
      if (similarHits && similarHits.length > 0) {
        const matchedHit = similarHits.find((h) => h.complaint.category === nlpData.category);
        if (matchedHit) {
          duplicateMatch = { complaint: matchedHit.complaint, similarityScore: matchedHit.score };
        }
      }
    } catch (esErr) {
      // ignore ES fallback
    }

    if (!duplicateMatch) {
      const activeComplaints = isDbConnected()
        ? await Complaint.find({ status: { $ne: "Resolved" } })
        : memoryStore.complaints.filter(c => c.status !== "Resolved");

      duplicateMatch = findDuplicateComplaint({ description, category: nlpData.category, location: nlpData.location }, activeComplaints);
    }

    if (duplicateMatch) {
      const matchedId = duplicateMatch.complaint._id || duplicateMatch.complaint.id;
      let complaint = null;

      if (isDbConnected()) {
        complaint = await Complaint.findById(matchedId);
      } else {
        complaint = memoryStore.complaints.find(c => (c._id || c.id) === matchedId);
      }

      const newReport = {
        userId: reporterId,
        userName: reporterName,
        userPhone: reporterPhone,
        description,
        image: imageUri,
        createdAt: new Date()
      };
      complaint.reports.push(newReport);
      complaint.reportCount = complaint.reports.length;

      if (imageUri && !complaint.images.includes(imageUri)) {
        complaint.images.push(imageUri);
      }

      const score = await calculatePriorityScore(
        complaint.severity,
        complaint.reportCount,
        complaint.createdAt,
        complaint.description,
        complaint.locationCoords,
        matchedId
      );
      complaint.priority = score;
      complaint.priorityLevel = getPriorityLevel(score);
      complaint.updatedAt = new Date();

      complaint.history.push({
        status: complaint.status,
        timestamp: new Date(),
        note: `Merged duplicate report from citizen (${reporterName}). Total reports: ${complaint.reportCount}. Dynamic priority elevated to ${complaint.priorityLevel}.`
      });

      if (isDbConnected()) {
        const savedComplaint = await complaint.save();
        await indexComplaint(savedComplaint);
        return res.status(200).json({
          success: true,
          isDuplicate: true,
          message: `We identified this issue is already reported at ${savedComplaint.location || "this location"}. We have merged your report with the existing complaint to prioritize it.`,
          complaint: { ...savedComplaint.toObject(), id: savedComplaint._id },
          report: newReport
        });
      } else {
        return res.status(200).json({
          success: true,
          isDuplicate: true,
          message: `We identified this issue is already reported at ${complaint.location || "this location"}. We have merged your report with the existing complaint to prioritize it.`,
          complaint: { ...complaint, id: matchedId },
          report: newReport
        });
      }
    } else {
      const initialScore = await calculatePriorityScore(nlpData.severity, 1, new Date().toISOString(), description, locationCoords, null);
      const newCompId = "comp_" + Date.now();

      const complaintData = {
        _id: newCompId,
        id: newCompId,
        title: nlpData.title,
        category: nlpData.category,
        department: nlpData.department,
        severity: nlpData.severity,
        location: nlpData.location || "Delhi Zone",
        locationCoords,
        description,
        status: "Pending",
        priority: initialScore,
        priorityLevel: getPriorityLevel(initialScore),
        reportCount: 1,
        images: imageUri ? [imageUri] : [],
        history: [{ status: "Pending", timestamp: new Date(), note: "System auto-registered complaint." }],
        reports: [{ userId: reporterId, userName: reporterName, userPhone: reporterPhone, description, image: imageUri, createdAt: new Date() }],
        comments: []
      };

      if (isDbConnected()) {
        const newComplaint = new Complaint(complaintData);
        const saved = await newComplaint.save();
        await indexComplaint(saved);

        return res.status(201).json({
          success: true,
          isDuplicate: false,
          message: "Your complaint has been successfully registered and routed to the department.",
          complaint: { ...saved.toObject(), id: saved._id },
          report: saved.reports[0]
        });
      } else {
        memoryStore.complaints.unshift(complaintData);
        return res.status(201).json({
          success: true,
          isDuplicate: false,
          message: "Your complaint has been successfully registered and routed to the department.",
          complaint: complaintData,
          report: complaintData.reports[0]
        });
      }
    }
  } catch (error) {
    console.error("Submission processing failed:", error);
    res.status(500).json({ error: "Failed to process complaint submission." });
  }
});

app.patch("/api/complaints/:id/status", async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!["Pending", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    if (isDbConnected()) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found." });

      complaint.status = status;
      complaint.updatedAt = new Date();
      complaint.history.push({
        status,
        timestamp: new Date(),
        note: note || `Status updated to ${status}.`
      });

      const saved = await complaint.save();
      await indexComplaint(saved);

      return res.json({
        success: true,
        message: `Complaint status updated to ${status}.`,
        complaint: { ...saved.toObject(), id: saved._id }
      });
    } else {
      const complaint = memoryStore.complaints.find(c => (c._id || c.id) === req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found." });

      complaint.status = status;
      complaint.updatedAt = new Date().toISOString();
      complaint.history.push({
        status,
        timestamp: new Date().toISOString(),
        note: note || `Status updated to ${status}.`
      });

      return res.json({
        success: true,
        message: `Complaint status updated to ${status}.`,
        complaint
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to update status." });
  }
});

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

app.post("/api/complaints/:id/support", optionalAuthenticateToken, async (req, res) => {
  try {
    const supporterId = req.userId;
    if (!supporterId) return res.status(401).json({ error: "Please sign in to support and upvote civic issues." });

    const supporterName = req.userName || "Citizen";
    const supporterPhone = req.userPhone || "Not provided";

    if (isDbConnected()) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found." });

      const alreadySupported = complaint.reports.some(
        (rep) => rep.userId && rep.userId.toString() === supporterId.toString()
      );
      if (alreadySupported) {
        return res.status(400).json({ error: "You have already registered your support for this issue." });
      }

      complaint.reports.push({
        userId: supporterId,
        userName: supporterName,
        userPhone: supporterPhone,
        description: "Supported this existing report to escalate community priority.",
        image: null,
        createdAt: new Date()
      });
      complaint.reportCount = complaint.reports.length;

      complaint.comments.push({
        userId: supporterId,
        userName: supporterName,
        commentText: "📢 Supported this civic issue to escalate priority.",
        createdAt: new Date()
      });

      const score = await calculatePriorityScore(
        complaint.severity,
        complaint.reportCount,
        complaint.createdAt,
        complaint.description,
        complaint.locationCoords,
        complaint._id
      );
      complaint.priority = score;
      complaint.priorityLevel = getPriorityLevel(score);
      complaint.updatedAt = new Date();

      complaint.history.push({
        status: complaint.status,
        timestamp: new Date(),
        note: `Received upvote/support from citizen (${supporterName}). Total reports: ${complaint.reportCount}. Escalated priority to ${complaint.priorityLevel}.`
      });

      const saved = await complaint.save();
      await indexComplaint(saved);

      return res.json({
        success: true,
        message: "Thank you for supporting this issue! Its community priority score has been elevated.",
        complaint: { ...saved.toObject(), id: saved._id }
      });
    } else {
      const complaint = memoryStore.complaints.find(c => (c._id || c.id) === req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found." });

      if (!complaint.reports) complaint.reports = [];
      if (!complaint.comments) complaint.comments = [];
      if (!complaint.history) complaint.history = [];

      const alreadySupported = complaint.reports.some(
        (rep) => rep.userId && rep.userId.toString() === supporterId.toString()
      );
      if (alreadySupported) {
        return res.status(400).json({ error: "You have already registered your support for this issue." });
      }

      complaint.reports.push({
        userId: supporterId,
        userName: supporterName,
        userPhone: supporterPhone,
        description: "Supported this existing report to escalate community priority.",
        image: null,
        createdAt: new Date().toISOString()
      });
      complaint.reportCount = complaint.reports.length;

      complaint.comments.push({
        userId: supporterId,
        userName: supporterName,
        commentText: "📢 Supported this civic issue to escalate priority.",
        createdAt: new Date().toISOString()
      });

      const score = await calculatePriorityScore(
        complaint.severity,
        complaint.reportCount,
        complaint.createdAt,
        complaint.description,
        complaint.locationCoords,
        req.params.id
      );
      complaint.priority = score;
      complaint.priorityLevel = getPriorityLevel(score);
      complaint.updatedAt = new Date().toISOString();

      complaint.history.push({
        status: complaint.status,
        timestamp: new Date().toISOString(),
        note: `Received upvote/support from citizen (${supporterName}). Total reports: ${complaint.reportCount}. Escalated priority to ${complaint.priorityLevel}.`
      });

      return res.json({
        success: true,
        message: "Thank you for supporting this issue! Its community priority score has been elevated.",
        complaint
      });
    }
  } catch (error) {
    console.error("Support escalation failed:", error);
    res.status(500).json({ error: "Failed to upvote/support complaint." });
  }
});

app.post("/api/complaints/:id/comments", optionalAuthenticateToken, async (req, res) => {
  try {
    const { commentText } = req.body;
    if (!commentText || commentText.trim() === "") {
      return res.status(400).json({ error: "Comment text is required." });
    }

    const commenterId = req.userId || null;
    const commenterName = req.userName || req.body.userName || "Anonymous Citizen";

    if (isDbConnected()) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found." });

      complaint.comments.push({
        userId: commenterId,
        userName: commenterName,
        commentText: commentText.trim(),
        createdAt: new Date()
      });

      const saved = await complaint.save();
      await indexComplaint(saved);

      return res.json({
        success: true,
        message: "Comment posted successfully.",
        comments: saved.comments
      });
    } else {
      const complaint = memoryStore.complaints.find(c => (c._id || c.id) === req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found." });

      if (!complaint.comments) complaint.comments = [];
      const newComment = {
        userId: commenterId,
        userName: commenterName,
        commentText: commentText.trim(),
        createdAt: new Date().toISOString()
      };
      complaint.comments.push(newComment);

      return res.json({
        success: true,
        message: "Comment posted successfully.",
        comments: complaint.comments
      });
    }
  } catch (error) {
    console.error("Failed to add comment:", error);
    res.status(500).json({ error: "Failed to post comment." });
  }
});

app.get("/api/complaints/:id/comments", async (req, res) => {
  try {
    if (isDbConnected()) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found." });
      return res.json(complaint.comments || []);
    } else {
      const complaint = memoryStore.complaints.find(c => (c._id || c.id) === req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found." });
      return res.json(complaint.comments || []);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to load comments." });
  }
});

app.get("/api/complaints/nearby", async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radius) || 1.5;

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ error: "Latitude and Longitude parameters are required." });
    }

    let results = await searchNearbyComplaints(latNum, lngNum, radiusNum);
    if (results === null) {
      const activeComplaints = isDbConnected()
        ? await Complaint.find({ status: { $ne: "Resolved" } })
        : memoryStore.complaints.filter(c => c.status !== "Resolved");

      results = activeComplaints
        .filter((comp) => {
          if (!comp.locationCoords || !comp.locationCoords.lat || !comp.locationCoords.lng) return false;
          const latDiff = Math.abs(comp.locationCoords.lat - latNum);
          const lngDiff = Math.abs(comp.locationCoords.lng - lngNum);
          return latDiff < 0.015 && lngDiff < 0.015;
        })
        .map((c) => (c.toObject ? { _id: c._id, id: c._id, ...c.toObject() } : { ...c }));
    }

    res.json(results);
  } catch (error) {
    console.error("Nearby complaints search failed:", error);
    res.status(500).json({ error: "Failed to retrieve nearby complaints." });
  }
});

app.delete("/api/complaints/:id", async (req, res) => {
  try {
    if (isDbConnected()) {
      const complaint = await Complaint.findByIdAndDelete(req.params.id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found." });
      await deleteComplaint(req.params.id);
      return res.json({ success: true, message: "Complaint removed successfully." });
    } else {
      const idx = memoryStore.complaints.findIndex(c => (c._id || c.id) === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Complaint not found." });
      memoryStore.complaints.splice(idx, 1);
      return res.json({ success: true, message: "Complaint removed successfully." });
    }
  } catch (err) {
    console.error("Failed to delete complaint:", err);
    res.status(500).json({ error: "Failed to remove complaint." });
  }
});

app.listen(PORT, () => {
  console.log(`Delhi Civic Service Navigator Backend listening on port ${PORT}`);
});
