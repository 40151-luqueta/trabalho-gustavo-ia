import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { config } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Erro operacional conhecido
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode);
    return;
  }

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    sendError(res, 'VALIDATION_ERROR', messages.join(', '), 400);
    return;
  }

  // Erro de ID inválido do Mongoose (CastError)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    sendError(res, 'INVALID_ID', `Identificador informado é inválido: ${err.value}`, 400);
    return;
  }

  // Erro de chave duplicada no MongoDB (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    if (fields.includes('laboratorioId') && fields.includes('data') && fields.includes('aula')) {
      sendError(
        res,
        'RESERVATION_CONFLICT',
        'O laboratório já está reservado para esta data e aula por outro usuário.',
        409
      );
      return;
    }
    if (fields.includes('email')) {
      sendError(res, 'EMAIL_ALREADY_EXISTS', 'Este endereço de email já está cadastrado.', 409);
      return;
    }
    if (fields.includes('codigo')) {
      sendError(res, 'CODE_ALREADY_EXISTS', 'Já existe um registro com este código.', 409);
      return;
    }
    sendError(res, 'DUPLICATE_ENTRY', 'Registro duplicado no sistema.', 409);
    return;
  }

  // Erros de JWT
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'AUTH_TOKEN_INVALID', 'Token de autenticação inválido.', 401);
    return;
  }

  // Log do erro não tratado
  console.error('[ERRO INTERNO NÃO TRATADO]:', err);

  const message =
    config.nodeEnv === 'production'
      ? 'Ocorreu um erro interno no servidor.'
      : err.message || 'Erro interno';

  sendError(res, 'INTERNAL_SERVER_ERROR', message, 500);
}
