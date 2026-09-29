import { Router } from 'express';
import {
  listReservations,
  checkReservation,
  createReservation,
  cancelReservation
} from '../controllers/reservationController';
import { authenticate } from '../middleware/auth';
import { requireCanReserve } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

// Listar reservas (professores e admins)
router.get('/', listReservations);

// Verificar disponibilidade e elegibilidade antes de confirmar (UX assistida)
router.post('/check', requireCanReserve, checkReservation);

// Criar reserva (apenas professores ativos e admins)
router.post('/', requireCanReserve, createReservation);

// Cancelar reserva (dono da reserva ou admin)
router.delete('/:id', requireCanReserve, cancelReservation);

export default router;
