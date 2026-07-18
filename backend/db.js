import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models/User.js";
import { Complaint } from "./models/Complaint.js";

// Helper to calculate proximity and priority score
export async function calculatePriorityScore(severity, reportCount, createdAtStr, description = "", coords = null, selfId = null) {
  let baseScore = 15;
  if (severity === "Medium") baseScore = 35;
  if (severity === "High") baseScore = 60;
  if (severity === "Critical") baseScore = 80;

  // Logarithmic report count scaling
  const reportBonus = reportCount > 1 ? 12 * Math.log(reportCount) : 0;

  // Age factor: hours since createdAt, +1 per hour, max +20
  const hours = Math.max(0, (Date.now() - new Date(createdAtStr).getTime()) / (1000 * 60 * 60));
  const ageFactor = Math.min(20, Math.floor(hours));

  // High risk safety impact keywords
  const safetyKeywords = ["danger", "accident", "injured", "sparks", "fire", "live wire", "open manhole", "broken leg", "hospital", "blocking traffic"];
  const descLower = description.toLowerCase();
  const safetyBonus = safetyKeywords.some(kw => descLower.includes(kw)) ? 10 : 0;

  // Area Congestion Boost: +5 for every other active complaint within ~1km (0.01 deg lat/lng)
  let areaBoost = 0;
  if (coords && coords.lat && coords.lng) {
    try {
      const query = { status: { $ne: "Resolved" } };
      if (selfId) {
        query._id = { $ne: selfId };
      }
      const otherActive = await Complaint.find(query);
      
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
      
      areaBoost = Math.min(25, nearbyCount * 5); // Max +25 pts area congestion boost
    } catch (err) {
      console.error("Error calculating area boost:", err);
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
    let seededUserId = null;

    if (userCount === 0) {
      console.log("Seeding default citizen account...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      const demoUser = new User({
        name: "Demo Citizen",
        phone: "9810123456",
        password: hashedPassword
      });
      const savedUser = await demoUser.save();
      seededUserId = savedUser._id;
      console.log("Seeding completed: Account created (Phone: 9810123456, Password: password123)");
    } else {
      const existingUser = await User.findOne({ phone: "9810123456" });
      if (existingUser) seededUserId = existingUser._id;
    }

    const complaintCount = await Complaint.countDocuments();
    if (complaintCount === 0) {
      console.log("Seeding initial Delhi complaints data...");
      
      const seedComplaints = [
        {
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
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          history: [
            { status: "Pending", timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), note: "System auto-registered complaint." },
            { status: "In Progress", timestamp: new Date(Date.now() - 40 * 60 * 60 * 1000), note: "Routed to DJB maintenance team." }
          ],
          reports: [
            {
              userId: seededUserId,
              userName: "Amit Sharma",
              userPhone: "98101XXXXX",
              description: "Huge sewage overflow on outer ring road near Munirka causing terrible smell and traffic block.",
              image: "seed_sewage_1.jpg",
              createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
            },
            {
              userName: "Priya Patel",
              userPhone: "95603XXXXX",
              description: "Dirty sewage water flooding the road outside Munirka station, cannot walk without stepping in sewer water.",
              image: "seed_sewage_2.jpg",
              createdAt: new Date(Date.now() - 42 * 60 * 60 * 1000)
            },
            {
              userName: "Rohan Gupta",
              userPhone: "99104XXXXX",
              description: "Drainage overflow near gate 1 of Munirka metro station, traffic is slow and smell is horrible.",
              image: null,
              createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000)
            }
          ]
        },
        {
          title: "Broken Street Lights at Janakpuri District Center",
          category: "Street Lights",
          department: "MCD (Municipal Corporation of Delhi)",
          severity: "High",
          location: "Janakpuri District Center",
          locationCoords: { lat: 28.6288, lng: 77.0784 },
          description: "Street lights near District Center Gate 2 are not working for a week. The entire stretch is pitch dark and dangerous for commuters at night.",
          status: "Pending",
          priority: 72,
          priorityLevel: "High",
          reportCount: 1,
          images: ["seed_lights_1.jpg"],
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hrs ago
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          history: [
            { status: "Pending", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), note: "System auto-registered complaint." }
          ],
          reports: [
            {
              userId: seededUserId,
              userName: "Vikram Singh",
              userPhone: "98711XXXXX",
              description: "Street lights near District Center Gate 2 are not working for a week. The entire stretch is pitch dark and dangerous for commuters at night.",
              image: "seed_lights_1.jpg",
              createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
            }
          ]
        },
        {
          title: "Garbage Dump near Rohini Sector 8 Market",
          category: "Garbage Collection",
          department: "MCD (Municipal Corporation of Delhi)",
          severity: "Medium",
          location: "Rohini Sector 8 Market",
          locationCoords: { lat: 28.7032, lng: 77.1264 },
          description: "Massive pile of plastic and organic waste accumulating near Sector 8 market. Stink is unbearable and stray cows are eating trash.",
          status: "Pending",
          priority: 55,
          priorityLevel: "Medium",
          reportCount: 1,
          images: ["seed_garbage_1.jpg"],
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hrs ago
          updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          history: [
            { status: "Pending", timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), note: "System auto-registered complaint." }
          ],
          reports: [
            {
              userId: seededUserId,
              userName: "Sneha Goel",
              userPhone: "98188XXXXX",
              description: "Massive pile of plastic and organic waste accumulating near Sector 8 market. Stink is unbearable and stray cows are eating trash.",
              image: "seed_garbage_1.jpg",
              createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
            }
          ]
        },
        {
          title: "Electric Transformer Sparks in Saket Block E",
          category: "Electricity",
          department: "DTL / DISCOM (Tata Power/BSES)",
          severity: "Critical",
          location: "Saket Block E Market",
          locationCoords: { lat: 28.5244, lng: 77.2066 },
          description: "Sparks coming out of electric transformer box outside Block E market. Extremely dangerous, short circuit hazard!",
          status: "Resolved",
          priority: 95,
          priorityLevel: "Critical",
          reportCount: 1,
          images: ["seed_sparks_1.jpg"],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          updatedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
          history: [
            { status: "Pending", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), note: "System auto-registered complaint." },
            { status: "In Progress", timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000), note: "Technicians dispatched." },
            { status: "Resolved", timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000), note: "Fuse box replaced and wires insulated." }
          ],
          reports: [
            {
              userName: "Rajesh Kumar",
              userPhone: "98991XXXXX",
              description: "Sparks coming out of electric transformer box outside Block E market. Extremely dangerous, short circuit hazard!",
              image: "seed_sparks_1.jpg",
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          ]
        },
        {
          title: "Encroachment of Footpath in Lajpat Nagar II",
          category: "Encroachment",
          department: "MCD (Municipal Corporation of Delhi)",
          severity: "Medium",
          location: "Lajpat Nagar II Market",
          locationCoords: { lat: 28.5684, lng: 77.2407 },
          description: "Street vendors have completely blocked the pedestrian path. Pedestrians have to walk on the main road causing heavy traffic and risk.",
          status: "In Progress",
          priority: 45,
          priorityLevel: "Medium",
          reportCount: 1,
          images: ["seed_vendors_1.jpg"],
          createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
          updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
          history: [
            { status: "Pending", timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000), note: "System auto-registered complaint." },
            { status: "In Progress", timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000), note: "Assigned to MCD anti-encroachment drive team." }
          ],
          reports: [
            {
              userName: "Neha Sen",
              userPhone: "93122XXXXX",
              description: "Street vendors have completely blocked the pedestrian path. Pedestrians have to walk on the main road causing heavy traffic and risk.",
              image: "seed_vendors_1.jpg",
              createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000)
            }
          ]
        }
      ];

      await Complaint.insertMany(seedComplaints);
      console.log("Complaint database seeded successfully!");
    }
  } catch (err) {
    console.error("Database seeding failed:", err);
  }
}

// Database Connection Manager
export async function connectDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/delhi_civic_navigator";
  try {
    await mongoose.connect(uri);
    console.log("MongoDB connection established successfully.");
    await seedDataIfEmpty();
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}

// Helper: Recalculate priority scores dynamically on query
export async function queryComplaints() {
  const complaints = await Complaint.find().sort({ createdAt: -1 });
  
  // Update scores in real-time if not resolved to account for time elapsed & new proximity reports
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
    // Re-fetch sorted list if priorities modified
    return await Complaint.find().sort({ createdAt: -1 });
  }
  return complaints;
}
