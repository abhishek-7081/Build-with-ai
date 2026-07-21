import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Complaint } from "../models/Complaint.js";
import { getInitialSeedData } from "../utils/seedData.js";

// Disable query buffering so Mongoose fails fast if DB is disconnected
mongoose.set("bufferCommands", false);

// In-Memory Fallback Store (Used when MongoDB is unreachable)
export const memoryStore = {
  users: [],
  complaints: []
};

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// Initialize memory store on load
export async function initMemoryStore() {
  const { users, complaints } = await getInitialSeedData();
  memoryStore.users = [...users];
  memoryStore.complaints = [...complaints];
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
export async function seedDataIfEmpty() {
  try {
    const { users, complaints } = await getInitialSeedData();

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("Seeding default accounts into MongoDB...");
      await User.insertMany(users);
      console.log("Seeding completed: Default citizen and department accounts initialized.");
    }

    const complaintCount = await Complaint.countDocuments();
    if (complaintCount === 0) {
      console.log("Seeding initial Delhi complaints data into MongoDB...");
      await Complaint.insertMany(complaints);
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
