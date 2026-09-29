import { Router } from 'express';
import { listLabs, getLab, createLab, updateLab, deleteLab } from '../controllers/labController';
import { listEquipments, createEquipment } from '../controllers/equipmentController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';

const router = Router();

// Leitura de laboratórios é aberta (usuários autenticados ou não)
router.get('/', listLabs);
router.get('/:id', getLab);

// Equipamentos do laboratório
router.get('/:laboratorioId/equipments', listEquipments);
router.post('/:laboratorioId/equipments', authenticate, requireRole('ADMIN'), createEquipment);

// Modificações de laboratório exigem ADMIN
router.post('/', authenticate, requireRole('ADMIN'), createLab);
router.patch('/:id', authenticate, requireRole('ADMIN'), updateLab);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteLab);

export default router;
