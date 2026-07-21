import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  userName: { type: String, default: "Anonymous" },
  userPhone: { type: String, default: "Not provided" },
  description: { type: String, required: true },
  image: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  userName: { type: String, required: true },
  commentText: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const historySchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: "" }
});

const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  department: { type: String, required: true },
  severity: { type: String, required: true },
  location: { type: String, default: "Delhi" },
  locationCoords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  description: { type: String, required: true },
  status: { type: String, enum: ["Pending", "In Progress", "Resolved", "Rejected"], default: "Pending" },
  assignedTo: { type: String, default: null },
  priority: { type: Number, default: 15 },
  priorityLevel: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Low" },
  reportCount: { type: Number, default: 1 },
  images: [{ type: String }],
  history: [historySchema],
  reports: [reportSchema],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Complaint = mongoose.models.Complaint || mongoose.model("Complaint", complaintSchema);
