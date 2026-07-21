import { v2 as cloudinary } from 'cloudinary';
import { 
  queryComplaints, 
  calculatePriorityScore, 
  getPriorityLevel, 
  isDbConnected, 
  memoryStore 
} from '../config/db.js';
import { analyzeDescription } from '../services/aiRouterService.js';
import { findDuplicateComplaint } from '../services/duplicateDetector.js';
import { 
  indexComplaint, 
  deleteComplaint as deleteElasticComplaint, 
  searchNearbyComplaints, 
  findSimilarElasticComplaints 
} from '../services/elasticService.js';
import { Complaint } from '../models/Complaint.js';

export async function getComplaints(req, res) {
  try {
    const complaints = await queryComplaints();
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve complaints.' });
  }
}

export async function getCitizenComplaints(req, res) {
  try {
    if (isDbConnected()) {
      const myIssues = await Complaint.find({ 'reports.userId': req.userId }).sort({ updatedAt: -1 });
      return res.json(myIssues);
    } else {
      const myIssues = memoryStore.complaints.filter(c =>
        c.reports && c.reports.some(r => r.userId && r.userId.toString() === req.userId.toString())
      );
      return res.json(myIssues);
    }
  } catch (error) {
    console.error('Failed to query citizen issues:', error);
    res.status(500).json({ error: 'Failed to load your complaints.' });
  }
}

export async function getComplaintReports(req, res) {
  try {
    if (isDbConnected()) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
      return res.json(complaint.reports);
    } else {
      const complaint = memoryStore.complaints.find(c => (c._id || c.id) === req.params.id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
      return res.json(complaint.reports || []);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
}

export async function createComplaint(req, res) {
  try {
    const { description, locationOverride, latitude, longitude } = req.body;
    if (!description || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required.' });
    }

    const reporterId = req.userId || null;
    const reporterName = req.userName || req.body.userName || 'Anonymous Citizen';
    const reporterPhone = req.userPhone || req.body.userPhone || 'Not provided';

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const locationCoords = {
      lat: !isNaN(latNum) ? latNum : 28.6139,
      lng: !isNaN(lngNum) ? lngNum : 77.2090
    };

    let imageUri = null;
    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        try {
          const cloudResult = await cloudinary.uploader.upload(req.file.path, {
            folder: 'delhi_civic_navigator'
          });
          imageUri = cloudResult.secure_url;
        } catch (uploadError) {
          console.error('Cloudinary upload failed, using local disk fallback:', uploadError);
          imageUri = req.file.filename;
        }
      } else {
        imageUri = req.file.filename;
      }
    }

    const nlpData = await analyzeDescription(description);
    if (locationOverride && locationOverride.trim() !== '') {
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
      // ignore ES
    }

    if (!duplicateMatch) {
      const activeComplaints = isDbConnected()
        ? await Complaint.find({ status: { $ne: 'Resolved' } })
        : memoryStore.complaints.filter(c => c.status !== 'Resolved');

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
          message: `We identified this issue is already reported at ${savedComplaint.location || 'this site'}. We merged your report to elevate community priority.`,
          complaint: { ...savedComplaint.toObject(), id: savedComplaint._id },
          report: newReport
        });
      } else {
        return res.status(200).json({
          success: true,
          isDuplicate: true,
          message: `We identified this issue is already reported at ${complaint.location || 'this site'}. We merged your report to elevate community priority.`,
          complaint: { ...complaint, id: matchedId },
          report: newReport
        });
      }
    } else {
      const initialScore = await calculatePriorityScore(nlpData.severity, 1, new Date().toISOString(), description, locationCoords, null);
      const newCompId = 'comp_' + Date.now();

      const complaintData = {
        _id: newCompId,
        id: newCompId,
        title: nlpData.title,
        category: nlpData.category,
        department: nlpData.department,
        severity: nlpData.severity,
        location: nlpData.location || 'Delhi Zone',
        locationCoords,
        description,
        status: 'Pending',
        priority: initialScore,
        priorityLevel: getPriorityLevel(initialScore),
        reportCount: 1,
        images: imageUri ? [imageUri] : [],
        history: [{ status: 'Pending', timestamp: new Date(), note: 'System auto-registered complaint.' }],
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
          message: 'Your complaint has been successfully registered and routed to the department.',
          complaint: { ...saved.toObject(), id: saved._id },
          report: saved.reports[0]
        });
      } else {
        memoryStore.complaints.unshift(complaintData);
        return res.status(201).json({
          success: true,
          isDuplicate: false,
          message: 'Your complaint has been successfully registered and routed to the department.',
          complaint: complaintData,
          report: complaintData.reports[0]
        });
      }
    }
  } catch (error) {
    console.error('Submission processing failed:', error);
    res.status(500).json({ error: 'Failed to process complaint submission.' });
  }
}

export async function updateStatus(req, res) {
  try {
    const { status, note, assignedTo } = req.body;
    if (!['Pending', 'In Progress', 'Resolved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    if (isDbConnected()) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

      complaint.status = status;
      if (assignedTo !== undefined) complaint.assignedTo = assignedTo;
      complaint.updatedAt = new Date();
      complaint.history.push({
        status,
        timestamp: new Date(),
        note: note || `Status updated to ${status} by ${req.userName || 'Department Official'}.`
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
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

      complaint.status = status;
      if (assignedTo !== undefined) complaint.assignedTo = assignedTo;
      complaint.updatedAt = new Date().toISOString();
      complaint.history.push({
        status,
        timestamp: new Date().toISOString(),
        note: note || `Status updated to ${status} by ${req.userName || 'Department Official'}.`
      });

      return res.json({
        success: true,
        message: `Complaint status updated to ${status}.`,
        complaint
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
}

export async function supportComplaint(req, res) {
  try {
    const supporterId = req.userId;
    if (!supporterId) return res.status(401).json({ error: 'Please sign in to support and upvote civic issues.' });

    const supporterName = req.userName || 'Citizen';
    const supporterPhone = req.userPhone || 'Not provided';

    if (isDbConnected()) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

      const alreadySupported = complaint.reports.some(
        (rep) => rep.userId && rep.userId.toString() === supporterId.toString()
      );
      if (alreadySupported) {
        return res.status(400).json({ error: 'You have already registered your support for this issue.' });
      }

      complaint.reports.push({
        userId: supporterId,
        userName: supporterName,
        userPhone: supporterPhone,
        description: 'Supported this existing report to escalate community priority.',
        image: null,
        createdAt: new Date()
      });
      complaint.reportCount = complaint.reports.length;

      complaint.comments.push({
        userId: supporterId,
        userName: supporterName,
        commentText: '📢 Supported this civic issue to escalate priority.',
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
        message: 'Thank you for supporting this issue! Its community priority score has been elevated.',
        complaint: { ...saved.toObject(), id: saved._id }
      });
    } else {
      const complaint = memoryStore.complaints.find(c => (c._id || c.id) === req.params.id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

      if (!complaint.reports) complaint.reports = [];
      if (!complaint.comments) complaint.comments = [];
      if (!complaint.history) complaint.history = [];

      const alreadySupported = complaint.reports.some(
        (rep) => rep.userId && rep.userId.toString() === supporterId.toString()
      );
      if (alreadySupported) {
        return res.status(400).json({ error: 'You have already registered your support for this issue.' });
      }

      complaint.reports.push({
        userId: supporterId,
        userName: supporterName,
        userPhone: supporterPhone,
        description: 'Supported this existing report to escalate community priority.',
        image: null,
        createdAt: new Date().toISOString()
      });
      complaint.reportCount = complaint.reports.length;

      complaint.comments.push({
        userId: supporterId,
        userName: supporterName,
        commentText: '📢 Supported this civic issue to escalate priority.',
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
        message: 'Thank you for supporting this issue! Its community priority score has been elevated.',
        complaint
      });
    }
  } catch (error) {
    console.error('Support escalation failed:', error);
    res.status(500).json({ error: 'Failed to upvote/support complaint.' });
  }
}

export async function addComment(req, res) {
  try {
    const { commentText } = req.body;
    if (!commentText || commentText.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    const commenterId = req.userId || null;
    const commenterName = req.userName || req.body.userName || 'Anonymous Citizen';

    if (isDbConnected()) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

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
        message: 'Comment posted successfully.',
        comments: saved.comments
      });
    } else {
      const complaint = memoryStore.complaints.find(c => (c._id || c.id) === req.params.id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

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
        message: 'Comment posted successfully.',
        comments: complaint.comments
      });
    }
  } catch (error) {
    console.error('Failed to add comment:', error);
    res.status(500).json({ error: 'Failed to post comment.' });
  }
}

export async function getComments(req, res) {
  try {
    if (isDbConnected()) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
      return res.json(complaint.comments || []);
    } else {
      const complaint = memoryStore.complaints.find(c => (c._id || c.id) === req.params.id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
      return res.json(complaint.comments || []);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load comments.' });
  }
}

export async function getNearbyComplaints(req, res) {
  try {
    const { lat, lng, radius } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radius) || 1.5;

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ error: 'Latitude and Longitude parameters are required.' });
    }

    let results = await searchNearbyComplaints(latNum, lngNum, radiusNum);
    if (results === null) {
      const activeComplaints = isDbConnected()
        ? await Complaint.find({ status: { $ne: 'Resolved' } })
        : memoryStore.complaints.filter(c => c.status !== 'Resolved');

      results = activeComplaints
        .filter((comp) => {
          if (!comp.locationCoords || !comp.locationCoords.lat || !comp.locationCoords.lng) return false;
          const latDiff = Math.abs(comp.locationCoords.lat - latNum);
          const lngDiff = Math.abs(comp.locationCoords.lng - lngNum);
          return latDiff < 0.02 && lngDiff < 0.02; // ~1.5 - 2km radius
        })
        .map((c) => (c.toObject ? { _id: c._id, id: c._id, ...c.toObject() } : { ...c }));
    }

    res.json(results);
  } catch (error) {
    console.error('Nearby complaints search failed:', error);
    res.status(500).json({ error: 'Failed to retrieve nearby complaints.' });
  }
}

export async function deleteComplaintById(req, res) {
  try {
    if (isDbConnected()) {
      const complaint = await Complaint.findByIdAndDelete(req.params.id);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
      await deleteElasticComplaint(req.params.id);
      return res.json({ success: true, message: 'Complaint removed successfully.' });
    } else {
      const idx = memoryStore.complaints.findIndex(c => (c._id || c.id) === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Complaint not found.' });
      memoryStore.complaints.splice(idx, 1);
      return res.json({ success: true, message: 'Complaint removed successfully.' });
    }
  } catch (err) {
    console.error('Failed to delete complaint:', err);
    res.status(500).json({ error: 'Failed to remove complaint.' });
  }
}
