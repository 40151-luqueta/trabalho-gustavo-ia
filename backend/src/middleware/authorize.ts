import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole } from '../models/User';
import { sendError } from '../utils/response';

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'AUTH_REQUIRED', 'Autenticação necessária', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(
        res,
        'AUTH_FORBIDDEN',
        `Acesso negado. Esta operação requer um dos seguintes papéis: ${roles.join(', ')}`,
        403
      );
      return;
    }

    next();
  };
}

export function requireActive(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 'AUTH_REQUIRED', 'Autenticação necessária', 401);
    return;
  }

  if (req.user.status === 'PENDENTE') {
    sendError(
      res,
      'USER_NOT_APPROVED',
      'Seu cadastro de professor ainda está pendente de aprovação pelo administrador.',
      403
    );
    return;
  }

  if (req.user.status === 'BLOQUEADO') {
    sendError(res, 'USER_BLOCKED', 'Usuário bloqueado pelo administrador.', 403);
    return;
  }

  next();
}

export function requireCanReserve(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 'AUTH_REQUIRED', 'Autenticação necessária', 401);
    return;
  }

  if (req.user.role === 'ALUNO') {
    sendError(
      res,
      'STUDENT_CANNOT_RESERVE',
      'Alunos não têm permissão para criar ou modificar reservas.',
      403
    );
    return;
  }

  if (req.user.role === 'PROFESSOR' && req.user.status === 'PENDENTE') {
    sendError(
      res,
      'USER_NOT_APPROVED',
      'Professores em estado pendente não podem realizar reservas.',
      403
    );
    return;
  }

  if (req.user.status === 'BLOQUEADO') {
    sendError(res, 'USER_BLOCKED', 'Usuário bloqueado não pode realizar reservas.', 403);
    return;
  }

  next();
}
