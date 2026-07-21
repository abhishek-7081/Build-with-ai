import express from 'express';
import { getAnalyticsData } from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/', getAnalyticsData);

export default router;
