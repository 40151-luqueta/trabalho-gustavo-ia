import { Router } from 'express';
import { listEquipments, updateEquipment, deleteEquipment } from '../controllers/equipmentController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';

const router = Router();

router.get('/', listEquipments);
router.patch('/:id', authenticate, requireRole('ADMIN'), updateEquipment);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteEquipment);

export default router;
