import { Router } from 'express';
import {
  listUsers,
  getUser,
  createUser,
  approveProfessor,
  updateUser,
  deleteUser
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';

const router = Router();

// Todas as rotas de gerenciamento de usuários exigem privilégio de ADMIN
router.use(authenticate, requireRole('ADMIN'));

router.get('/', listUsers);
router.post('/', createUser);
router.get('/:id', getUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/approve', approveProfessor);

export default router;
