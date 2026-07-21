import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models/User.js";
import { Complaint } from "./models/Complaint.js";

// Disable query buffering so Mongoose fails fast if DB is disconnected
mongoose.set("bufferCommands", false);

// In-Memory Fallback Store (Used when MongoDB is unreachable)
export const memoryStore = {
  users: [],
  complaints: []
};

// Helper to check connection state
export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// Initial seed data definition for in-memory fallback & DB seeding
const SEED_COMPLAINTS_DATA = [
  {
    _id: "seed_comp_1",
    id: "seed_comp_1",
    title: "Sewage Overflow near Munirka Metro Gate 1",
    category: "Sewage Problems",
    department: "DJB (Delhi Jal Board)",
    severity: "High",
    location: "Munirka Metro Gate 1",
    locationCoords: { lat: 28.5583, lng: 77.1685 },
    description: "Huge sewage overflow on outer ring road near Munirka causing terrible smell and traffic block.",
    status: "In Progress",
    priority: 84,
    priorityLevel: "Critical",
    reportCount: 3,
    images: ["seed_sewage_1.jpg", "seed_sewage_2.jpg"],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      { status: "Pending", timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), note: "Registered by citizen." },
      { status: "In Progress", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), note: "DJB Maintenance Team dispatched." }
    ],
    reports: [
      { userName: "Rohan Verma", userPhone: "9810011223", description: "Water leaking heavily on road.", createdAt: new Date(Date.now() - 3600000 * 5).toISOString() }
    ],
    comments: [
      { userName: "Priya Sharma", commentText: "Traffic is slow near Munirka flyover.", createdAt: new Date(Date.now() - 3600000 * 3).toISOString() }
    ]
  },
  {
    _id: "seed_comp_2",
    id: "seed_comp_2",
    title: "Dark Spot: Broken Street Lights at Janakpuri",
    category: "Street Lights",
    department: "MCD",
    severity: "Medium",
    location: "Janakpuri District Center Area",
    locationCoords: { lat: 28.6289, lng: 77.0788 },
    description: "Multiple street lights not functioning along main market lane creating safety issues.",
    status: "Pending",
    priority: 45,
    priorityLevel: "Medium",
    reportCount: 1,
    images: ["seed_lights_1.jpg"],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      { status: "Pending", timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), note: "Auto-routed to MCD portal." }
    ],
    reports: [
      { userName: "Ankita Sen", userPhone: "9876543210", description: "Street lights dark since 2 days.", createdAt: new Date(Date.now() - 3600000 * 12).toISOString() }
    ],
    comments: []
  },
  {
    _id: "seed_comp_3",
    id: "seed_comp_3",
    title: "Garbage Dump near Sector 8 Rohini",
    category: "Garbage Collection",
    department: "MCD",
    severity: "Medium",
    location: "Sector 8 Rohini Depot Zone",
    locationCoords: { lat: 28.7041, lng: 77.1025 },
    description: "Unattended municipal trash heap overflowing near market entrance.",
    status: "Pending",
    priority: 52,
    priorityLevel: "Medium",
    reportCount: 2,
    images: ["seed_garbage_1.jpg"],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      { status: "Pending", timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), note: "Logged by citizen." }
    ],
    reports: [
      { userName: "Suresh Kumar", userPhone: "9811122334", description: "Garbage pile growing daily.", createdAt: new Date(Date.now() - 3600000 * 24).toISOString() }
    ],
    comments: []
  }
];

// Initialize memory store with demo user and seed complaints
async function initMemoryStore() {
  if (memoryStore.users.length === 0) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    memoryStore.users.push({
      _id: "demo_user_id_123",
      id: "demo_user_id_123",
      name: "Demo Citizen",
      phone: "9810123456",
      password: hashedPassword
    });
  }
  if (memoryStore.complaints.length === 0) {
    memoryStore.complaints = [...SEED_COMPLAINTS_DATA];
  }
}
initMemoryStore();

// Helper to calculate proximity and priority score
export async function calculatePriorityScore(severity, reportCount, createdAtStr, description = "", coords = null, selfId = null) {
  let baseScore = 15;
  if (severity === "Medium") baseScore = 35;
  if (severity === "High") baseScore = 60;
  if (severity === "Critical") baseScore = 80;

  const reportBonus = reportCount > 1 ? 12 * Math.log(reportCount) : 0;
  const hours = Math.max(0, (Date.now() - new Date(createdAtStr).getTime()) / (1000 * 60 * 60));
  const ageFactor = Math.min(20, Math.floor(hours));

  const safetyKeywords = ["danger", "accident", "injured", "sparks", "fire", "live wire", "open manhole", "broken leg", "hospital", "blocking traffic"];
  const descLower = (description || "").toLowerCase();
  const safetyBonus = safetyKeywords.some(kw => descLower.includes(kw)) ? 10 : 0;

  let areaBoost = 0;
  if (coords && coords.lat && coords.lng) {
    try {
      let otherActive = [];
      if (isDbConnected()) {
        const query = { status: { $ne: "Resolved" } };
        if (selfId) query._id = { $ne: selfId };
        otherActive = await Complaint.find(query);
      } else {
        otherActive = memoryStore.complaints.filter(c => c.status !== "Resolved" && (c._id || c.id) !== selfId);
      }

      let nearbyCount = 0;
      otherActive.forEach(comp => {
        if (comp.locationCoords && comp.locationCoords.lat && comp.locationCoords.lng) {
          const latDiff = Math.abs(comp.locationCoords.lat - coords.lat);
          const lngDiff = Math.abs(comp.locationCoords.lng - coords.lng);
          if (latDiff < 0.01 && lngDiff < 0.01) {
            nearbyCount++;
          }
        }
      });
      areaBoost = Math.min(25, nearbyCount * 5);
    } catch (err) {
      // ignore
    }
  }

  let totalScore = Math.round(baseScore + reportBonus + ageFactor + safetyBonus + areaBoost);
  return Math.min(100, Math.max(5, totalScore));
}

export function getPriorityLevel(score) {
  if (score >= 81) return "Critical";
  if (score >= 56) return "High";
  if (score >= 31) return "Medium";
  return "Low";
}

// Seed Database Function
async function seedDataIfEmpty() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("Seeding default citizen account into MongoDB...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      const demoUser = new User({
        name: "Demo Citizen",
        phone: "9810123456",
        password: hashedPassword
      });
      await demoUser.save();
      console.log("Seeding completed: Account created (Phone: 9810123456, Password: password123)");
    }

    const complaintCount = await Complaint.countDocuments();
    if (complaintCount === 0) {
      console.log("Seeding initial Delhi complaints data into MongoDB...");
      await Complaint.insertMany(SEED_COMPLAINTS_DATA);
      console.log("Complaint database seeded successfully!");
    }
  } catch (err) {
    console.error("Database seeding error:", err.message);
  }
}

// Database Connection Manager
export async function connectDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/delhi_civic_navigator";
  const fallbackUri = "mongodb://127.0.0.1:27017/delhi_civic_navigator";

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log("MongoDB connection established successfully.");
    await seedDataIfEmpty();
  } catch (primaryError) {
    console.warn(`Primary MongoDB connection unreachable. Attempting local fallback at ${fallbackUri}...`);
    try {
      await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 2000 });
      console.log("Local MongoDB fallback connection established successfully.");
      await seedDataIfEmpty();
    } catch (fallbackError) {
      console.warn("MongoDB server unreachable. Operating seamlessly using High-Performance In-Memory Data Store.");
    }
  }
}

// Query complaints (DB or memory fallback)
export async function queryComplaints() {
  if (!isDbConnected()) {
    return memoryStore.complaints;
  }

  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    let updatedCount = 0;

    for (let comp of complaints) {
      if (comp.status !== "Resolved") {
        const oldScore = comp.priority;
        const newScore = await calculatePriorityScore(
          comp.severity,
          comp.reportCount,
          comp.createdAt,
          comp.description,
          comp.locationCoords,
          comp._id
        );
        if (oldScore !== newScore) {
          comp.priority = newScore;
          comp.priorityLevel = getPriorityLevel(newScore);
          await comp.save();
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      return await Complaint.find().sort({ createdAt: -1 });
    }
    return complaints;
  } catch (err) {
    console.warn("Query complaints DB fallback to memory store:", err.message);
    return memoryStore.complaints;
  }
}
