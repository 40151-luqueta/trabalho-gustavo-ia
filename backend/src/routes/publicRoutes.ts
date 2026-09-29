import { Router } from 'express';
import { getPublicSchedule, getPublicInfo } from '../controllers/publicController';

const router = Router();

// Endpoint totalmente público sem exigência de autenticação
router.get('/schedule', getPublicSchedule);
router.get('/info', getPublicInfo);

export default router;
