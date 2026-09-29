"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const response_1 = require("../utils/response");
const env_1 = require("../config/env");
class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 400, code = 'ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    // Erro operacional conhecido
    if (err instanceof AppError) {
        (0, response_1.sendError)(res, err.code, err.message, err.statusCode);
        return;
    }
    // Erro de validação do Mongoose
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        (0, response_1.sendError)(res, 'VALIDATION_ERROR', messages.join(', '), 400);
        return;
    }
    // Erro de ID inválido do Mongoose (CastError)
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        (0, response_1.sendError)(res, 'INVALID_ID', `Identificador informado é inválido: ${err.value}`, 400);
        return;
    }
    // Erro de chave duplicada no MongoDB (E11000)
    if (err.code === 11000) {
        const fields = Object.keys(err.keyPattern || {});
        if (fields.includes('laboratorioId') && fields.includes('data') && fields.includes('aula')) {
            (0, response_1.sendError)(res, 'RESERVATION_CONFLICT', 'O laboratório já está reservado para esta data e aula por outro usuário.', 409);
            return;
        }
        if (fields.includes('email')) {
            (0, response_1.sendError)(res, 'EMAIL_ALREADY_EXISTS', 'Este endereço de email já está cadastrado.', 409);
            return;
        }
        if (fields.includes('codigo')) {
            (0, response_1.sendError)(res, 'CODE_ALREADY_EXISTS', 'Já existe um registro com este código.', 409);
            return;
        }
        (0, response_1.sendError)(res, 'DUPLICATE_ENTRY', 'Registro duplicado no sistema.', 409);
        return;
    }
    // Erros de JWT
    if (err.name === 'JsonWebTokenError') {
        (0, response_1.sendError)(res, 'AUTH_TOKEN_INVALID', 'Token de autenticação inválido.', 401);
        return;
    }
    // Log do erro não tratado
    console.error('[ERRO INTERNO NÃO TRATADO]:', err);
    const message = env_1.config.nodeEnv === 'production'
        ? 'Ocorreu um erro interno no servidor.'
        : err.message || 'Erro interno';
    (0, response_1.sendError)(res, 'INTERNAL_SERVER_ERROR', message, 500);
}
