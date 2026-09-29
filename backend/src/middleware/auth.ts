import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User, IUser } from '../models/User';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  role: string;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'AUTH_TOKEN_MISSING', 'Token de autenticação não fornecido', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        sendError(res, 'AUTH_TOKEN_EXPIRED', 'Token expirado. Por favor, faça login novamente.', 401);
        return;
      }
      sendError(res, 'AUTH_TOKEN_INVALID', 'Token inválido', 401);
      return;
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'Usuário não encontrado', 401);
      return;
    }

    if (user.status === 'BLOQUEADO') {
      sendError(res, 'USER_BLOCKED', 'Usuário bloqueado pelo administrador', 403);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
