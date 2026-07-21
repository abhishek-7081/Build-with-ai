import express from 'express';
import { signupCitizen, loginCitizen, loginDepartment } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signupCitizen);
router.post('/login', loginCitizen);
router.post('/department-login', loginDepartment);

export default router;
