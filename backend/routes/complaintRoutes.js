import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import {
  getComplaints,
  getCitizenComplaints,
  getComplaintReports,
  createComplaint,
  updateStatus,
  supportComplaint,
  addComment,
  getComments,
  getNearbyComplaints,
  deleteComplaintById
} from '../controllers/complaintController.js';
import { authenticateToken, optionalAuthenticateToken, requireRole } from '../middlewares/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const router = express.Router();

router.get('/', getComplaints);
router.get('/nearby', getNearbyComplaints);
router.get('/citizen/my-complaints', authenticateToken, getCitizenComplaints);
router.get('/:id/reports', getComplaintReports);
router.get('/:id/comments', getComments);

router.post('/', optionalAuthenticateToken, upload.single('image'), createComplaint);
router.post('/:id/support', optionalAuthenticateToken, supportComplaint);
router.post('/:id/comments', optionalAuthenticateToken, addComment);

// Administrative Routes (Protected: Requires department or admin role)
router.patch('/:id/status', authenticateToken, requireRole('department', 'admin'), updateStatus);
router.delete('/:id', authenticateToken, requireRole('department', 'admin'), deleteComplaintById);

export default router;
