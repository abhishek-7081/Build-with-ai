import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DB_DIR, "database.json");

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Function to calculate priority score
export function calculatePriorityScore(severity, reportCount, createdAtStr, description = "") {
  let baseScore = 15;
  if (severity === "Medium") baseScore = 35;
  if (severity === "High") baseScore = 60;
  if (severity === "Critical") baseScore = 80;

  // Logarithmic report count scaling: 12 * ln(reportCount)
  const reportBonus = reportCount > 1 ? 12 * Math.log(reportCount) : 0;

  // Age factor: hours since createdAt, +1 per hour, max +20
  const hours = Math.max(0, (Date.now() - new Date(createdAtStr).getTime()) / (1000 * 60 * 60));
  const ageFactor = Math.min(20, Math.floor(hours));

  // High risk safety impact keywords
  const safetyKeywords = ["danger", "accident", "injured", "sparks", "fire", "live wire", "open manhole", "broken leg", "hospital", "blocking traffic"];
  const descLower = description.toLowerCase();
  const safetyBonus = safetyKeywords.some(kw => descLower.includes(kw)) ? 10 : 0;

  let totalScore = Math.round(baseScore + reportBonus + ageFactor + safetyBonus);
  return Math.min(100, Math.max(5, totalScore));
}

export function getPriorityLevel(score) {
  if (score >= 81) return "Critical";
  if (score >= 56) return "High";
  if (score >= 31) return "Medium";
  return "Low";
}

// Seed Data
const SEED_DATA = {
  complaints: [
    {
      id: "comp_1",
      title: "Sewage Overflow near Munirka Metro Gate 1",
      category: "Sewage Problems",
      department: "DJB (Delhi Jal Board)",
      severity: "High",
      location: "Munirka Metro Gate 1",
      description: "Huge sewage overflow on outer ring road near Munirka causing terrible smell and traffic block.",
      status: "In Progress",
      priority: 84,
      priorityLevel: "Critical",
      reportCount: 18,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      images: ["seed_sewage_1.jpg", "seed_sewage_2.jpg"],
      history: [
        { status: "Pending", timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), note: "System auto-registered complaint." },
        { status: "In Progress", timestamp: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(), note: "Routed to DJB maintenance team." }
      ]
    },
    {
      id: "comp_2",
      title: "Broken Street Lights at Janakpuri District Center",
      category: "Street Lights",
      department: "MCD (Municipal Corporation of Delhi)",
      severity: "High",
      location: "Janakpuri District Center",
      description: "Street lights near District Center Gate 2 are not working for a week. The entire stretch is pitch dark and dangerous for commuters at night.",
      status: "Pending",
      priority: 72,
      priorityLevel: "High",
      reportCount: 4,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hrs ago
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      images: ["seed_lights_1.jpg"],
      history: [
        { status: "Pending", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), note: "System auto-registered complaint." }
      ]
    },
    {
      id: "comp_3",
      title: "Garbage Dump near Rohini Sector 8 Market",
      category: "Garbage Collection",
      department: "MCD (Municipal Corporation of Delhi)",
      severity: "Medium",
      location: "Rohini Sector 8 Market",
      description: "Massive pile of plastic and organic waste accumulating near Sector 8 market. Stink is unbearable and stray cows are eating trash.",
      status: "Pending",
      priority: 55,
      priorityLevel: "Medium",
      reportCount: 8,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hrs ago
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      images: ["seed_garbage_1.jpg"],
      history: [
        { status: "Pending", timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), note: "System auto-registered complaint." }
      ]
    },
    {
      id: "comp_4",
      title: "Electric Transformer Sparks in Saket Block E",
      category: "Electricity",
      department: "DTL / DISCOM (Tata Power/BSES)",
      severity: "Critical",
      location: "Saket Block E Market",
      description: "Sparks coming out of electric transformer box outside Block E market. Extremely dangerous, short circuit hazard!",
      status: "Resolved",
      priority: 95,
      priorityLevel: "Critical",
      reportCount: 1,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      updatedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      images: ["seed_sparks_1.jpg"],
      history: [
        { status: "Pending", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), note: "System auto-registered complaint." },
        { status: "In Progress", timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), note: "Technicians dispatched." },
        { status: "Resolved", timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), note: "Fuse box replaced and wires insulated." }
      ]
    },
    {
      id: "comp_5",
      title: "Encroachment of Footpath in Lajpat Nagar II",
      category: "Encroachment",
      department: "MCD (Municipal Corporation of Delhi)",
      severity: "Medium",
      location: "Lajpat Nagar II Market",
      description: "Street vendors have completely blocked the pedestrian path. Pedestrians have to walk on the main road causing heavy traffic and risk.",
      status: "In Progress",
      priority: 45,
      priorityLevel: "Medium",
      reportCount: 3,
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
      updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      images: ["seed_vendors_1.jpg"],
      history: [
        { status: "Pending", timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), note: "System auto-registered complaint." },
        { status: "In Progress", timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), note: "Assigned to MCD anti-encroachment drive team." }
      ]
    }
  ],
  reports: [
    // Reports matching comp_1
    {
      id: "rep_1a",
      complaintId: "comp_1",
      description: "Huge sewage overflow on outer ring road near Munirka causing terrible smell and traffic block.",
      image: "seed_sewage_1.jpg",
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      userName: "Amit Sharma",
      userPhone: "98101XXXXX"
    },
    {
      id: "rep_1b",
      complaintId: "comp_1",
      description: "Dirty sewage water flooding the road outside Munirka station, cannot walk without stepping in sewer water.",
      image: "seed_sewage_2.jpg",
      createdAt: new Date(Date.now() - 42 * 60 * 60 * 1000).toISOString(),
      userName: "Priya Patel",
      userPhone: "95603XXXXX"
    },
    {
      id: "rep_1c",
      complaintId: "comp_1",
      description: "Drainage overflow near gate 1 of Munirka metro station, traffic is slow and smell is horrible.",
      image: null,
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      userName: "Rohan Gupta",
      userPhone: "99104XXXXX"
    },
    // Reports matching comp_2
    {
      id: "rep_2a",
      complaintId: "comp_2",
      description: "Street lights near District Center Gate 2 are not working for a week. The entire stretch is pitch dark and dangerous for commuters at night.",
      image: "seed_lights_1.jpg",
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      userName: "Vikram Singh",
      userPhone: "98711XXXXX"
    },
    // Reports matching comp_3
    {
      id: "rep_3a",
      complaintId: "comp_3",
      description: "Massive pile of plastic and organic waste accumulating near Sector 8 market. Stink is unbearable and stray cows are eating trash.",
      image: "seed_garbage_1.jpg",
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      userName: "Sneha Goel",
      userPhone: "98188XXXXX"
    },
    // Reports matching comp_4
    {
      id: "rep_4a",
      complaintId: "comp_4",
      description: "Sparks coming out of electric transformer box outside Block E market. Extremely dangerous, short circuit hazard!",
      image: "seed_sparks_1.jpg",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      userName: "Rajesh Kumar",
      userPhone: "98991XXXXX"
    },
    // Reports matching comp_5
    {
      id: "rep_5a",
      complaintId: "comp_5",
      description: "Street vendors have completely blocked the pedestrian path. Pedestrians have to walk on the main road causing heavy traffic and risk.",
      image: "seed_vendors_1.jpg",
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      userName: "Neha Sen",
      userPhone: "93122XXXXX"
    }
  ]
};

// Fill in other empty reports for the duplicate counts
for (let i = 4; i <= 18; i++) {
  SEED_DATA.reports.push({
    id: `rep_1_${i}`,
    complaintId: "comp_1",
    description: `Citizen duplicate report #${i} about sewage overflow in Munirka.`,
    image: null,
    createdAt: new Date(Date.now() - (48 - i) * 60 * 60 * 1000).toISOString(),
    userName: `Resident #${i}`,
    userPhone: "9812XXXXXX"
  });
}
for (let i = 2; i <= 4; i++) {
  SEED_DATA.reports.push({
    id: `rep_2_${i}`,
    complaintId: "comp_2",
    description: `Citizen duplicate report #${i} about street lights in Janakpuri.`,
    image: null,
    createdAt: new Date(Date.now() - (12 - i) * 60 * 60 * 1000).toISOString(),
    userName: `Resident #${i}`,
    userPhone: "9812XXXXXX"
  });
}
for (let i = 2; i <= 8; i++) {
  SEED_DATA.reports.push({
    id: `rep_3_${i}`,
    complaintId: "comp_3",
    description: `Citizen duplicate report #${i} about garbage pile at Rohini Sector 8.`,
    image: null,
    createdAt: new Date(Date.now() - (6 - i) * 60 * 60 * 1000).toISOString(),
    userName: `Resident #${i}`,
    userPhone: "9812XXXXXX"
  });
}
for (let i = 2; i <= 3; i++) {
  SEED_DATA.reports.push({
    id: `rep_5_${i}`,
    complaintId: "comp_5",
    description: `Citizen duplicate report #${i} about hawker encroachment in Lajpat Nagar.`,
    image: null,
    createdAt: new Date(Date.now() - (72 - i * 10) * 60 * 60 * 1000).toISOString(),
    userName: `Resident #${i}`,
    userPhone: "9812XXXXXX"
  });
}

// Read database file
export function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2));
    return SEED_DATA;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading DB file, recreating seed...", error);
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2));
    return SEED_DATA;
  }
}

// Write database file
export function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving DB file:", error);
    return false;
  }
}

// Query complaints
export function getComplaints() {
  const db = getDb();
  // Recalculate priority dynamically to account for elapsed time
  let changed = false;
  db.complaints.forEach(complaint => {
    if (complaint.status !== "Resolved") {
      const oldScore = complaint.priority;
      const newScore = calculatePriorityScore(
        complaint.severity,
        complaint.reportCount,
        complaint.createdAt,
        complaint.description
      );
      if (oldScore !== newScore) {
        complaint.priority = newScore;
        complaint.priorityLevel = getPriorityLevel(newScore);
        changed = true;
      }
    }
  });
  if (changed) {
    saveDb(db);
  }
  return db.complaints;
}

// Query reports linked to a complaint
export function getComplaintReports(complaintId) {
  const db = getDb();
  return db.reports.filter(r => r.complaintId === complaintId);
}

// Add a new complaint
export function insertComplaint(complaintData) {
  const db = getDb();
  const id = "comp_" + Math.random().toString(36).substr(2, 9);
  
  const score = calculatePriorityScore(
    complaintData.severity,
    1,
    new Date().toISOString(),
    complaintData.description
  );
  
  const complaint = {
    id,
    title: complaintData.title,
    category: complaintData.category,
    department: complaintData.department,
    severity: complaintData.severity,
    location: complaintData.location,
    description: complaintData.description,
    status: "Pending",
    priority: score,
    priorityLevel: getPriorityLevel(score),
    reportCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: complaintData.image ? [complaintData.image] : [],
    history: [
      { status: "Pending", timestamp: new Date().toISOString(), note: "System auto-registered complaint." }
    ]
  };

  db.complaints.unshift(complaint); // Add to beginning

  // Insert corresponding initial report
  const report = {
    id: "rep_" + Math.random().toString(36).substr(2, 9),
    complaintId: id,
    description: complaintData.description,
    image: complaintData.image || null,
    createdAt: new Date().toISOString(),
    userName: complaintData.userName || "Anonymous Citizen",
    userPhone: complaintData.userPhone || "Not provided"
  };
  db.reports.unshift(report);

  saveDb(db);
  return { complaint, report };
}

// Link report to existing complaint (Duplicate detected)
export function mergeDuplicateReport(complaintId, reportData) {
  const db = getDb();
  const complaintIndex = db.complaints.findIndex(c => c.id === complaintId);
  
  if (complaintIndex === -1) return null;
  
  const complaint = db.complaints[complaintIndex];
  
  // Link new report
  const report = {
    id: "rep_" + Math.random().toString(36).substr(2, 9),
    complaintId: complaintId,
    description: reportData.description,
    image: reportData.image || null,
    createdAt: new Date().toISOString(),
    userName: reportData.userName || "Anonymous Citizen",
    userPhone: reportData.userPhone || "Not provided"
  };
  db.reports.unshift(report);
  
  // Update complaint properties
  complaint.reportCount += 1;
  if (reportData.image && !complaint.images.includes(reportData.image)) {
    complaint.images.push(reportData.image);
  }
  
  // Recalculate priority
  const score = calculatePriorityScore(
    complaint.severity,
    complaint.reportCount,
    complaint.createdAt,
    complaint.description
  );
  complaint.priority = score;
  complaint.priorityLevel = getPriorityLevel(score);
  complaint.updatedAt = new Date().toISOString();
  
  // Add merge milestone to history
  complaint.history.push({
    status: complaint.status,
    timestamp: new Date().toISOString(),
    note: `Merged duplicate report from citizen (${report.userName}). Total reports: ${complaint.reportCount}. Priority raised to ${complaint.priorityLevel}.`
  });
  
  saveDb(db);
  return { complaint, report };
}

// Update complaint status
export function updateComplaintStatus(complaintId, status, note = "") {
  const db = getDb();
  const complaintIndex = db.complaints.findIndex(c => c.id === complaintId);
  
  if (complaintIndex === -1) return null;
  
  const complaint = db.complaints[complaintIndex];
  complaint.status = status;
  complaint.updatedAt = new Date().toISOString();
  complaint.history.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Status updated to ${status}.`
  });
  
  saveDb(db);
  return complaint;
}
