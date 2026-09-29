import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';

const router = Router();

router.get('/', getSettings);
router.patch('/', authenticate, requireRole('ADMIN'), updateSettings);

export default router;
