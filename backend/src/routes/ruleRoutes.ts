import { Router } from 'express';
import { listRules, createRule, updateRule, deleteRule } from '../controllers/ruleController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

// Professores e Admins podem visualizar regras
router.get('/', requireRole('PROFESSOR', 'ADMIN'), listRules);

// Apenas Administradores podem criar, alterar ou remover regras
router.post('/', requireRole('ADMIN'), createRule);
router.patch('/:id', requireRole('ADMIN'), updateRule);
router.delete('/:id', requireRole('ADMIN'), deleteRule);

export default router;
