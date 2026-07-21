import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getInitialSeedData() {
  const jsonPath = path.join(__dirname, '..', 'data', 'database.json');
  let complaints = [];

  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.complaints)) {
        complaints = parsed.complaints;
      }
    } catch (err) {
      console.warn("Could not parse database.json for seed data, using default fallback:", err.message);
    }
  }

  // Ensure every complaint has default locationCoords if missing
  complaints = complaints.map(c => {
    if (!c.locationCoords || !c.locationCoords.lat || !c.locationCoords.lng) {
      // Default coordinates for Delhi landmarks
      return {
        ...c,
        locationCoords: { lat: 28.6139, lng: 77.2090 }
      };
    }
    return c;
  });

  // Create department gateway accounts with temporary dev password '123456'
  const devPasswordHash = await bcrypt.hash("123456", 10);
  const citizenPasswordHash = await bcrypt.hash("password123", 10);

  const users = [
    {
      _id: "user_citizen_demo",
      id: "user_citizen_demo",
      name: "Demo Citizen",
      phone: "9810123456",
      password: citizenPasswordHash,
      role: "citizen",
      department: null
    },
    {
      _id: "user_dept_mcd",
      id: "user_dept_mcd",
      name: "MCD Official",
      phone: "mcd_admin",
      password: devPasswordHash,
      role: "department",
      department: "MCD"
    },
    {
      _id: "user_dept_pwd",
      id: "user_dept_pwd",
      name: "PWD Official",
      phone: "pwd_admin",
      password: devPasswordHash,
      role: "department",
      department: "PWD"
    },
    {
      _id: "user_dept_djb",
      id: "user_dept_djb",
      name: "DJB Official",
      phone: "djb_admin",
      password: devPasswordHash,
      role: "department",
      department: "DJB"
    },
    {
      _id: "user_dept_traffic",
      id: "user_dept_traffic",
      name: "Traffic Police Official",
      phone: "traffic_admin",
      password: devPasswordHash,
      role: "department",
      department: "Traffic"
    },
    {
      _id: "user_dept_elec",
      id: "user_dept_elec",
      name: "DISCOM Power Grid Official",
      phone: "power_admin",
      password: devPasswordHash,
      role: "department",
      department: "Electricity"
    },
    {
      _id: "user_dept_superadmin",
      id: "user_dept_superadmin",
      name: "Central Admin Gateway",
      phone: "admin",
      password: devPasswordHash,
      role: "admin",
      department: "SuperAdmin"
    }
  ];

  return { users, complaints };
}
