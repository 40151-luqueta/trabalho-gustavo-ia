"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
exports.requireActive = requireActive;
exports.requireCanReserve = requireCanReserve;
const response_1 = require("../utils/response");
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            (0, response_1.sendError)(res, 'AUTH_REQUIRED', 'Autenticação necessária', 401);
            return;
        }
        if (!roles.includes(req.user.role)) {
            (0, response_1.sendError)(res, 'AUTH_FORBIDDEN', `Acesso negado. Esta operação requer um dos seguintes papéis: ${roles.join(', ')}`, 403);
            return;
        }
        next();
    };
}
function requireActive(req, res, next) {
    if (!req.user) {
        (0, response_1.sendError)(res, 'AUTH_REQUIRED', 'Autenticação necessária', 401);
        return;
    }
    if (req.user.status === 'PENDENTE') {
        (0, response_1.sendError)(res, 'USER_NOT_APPROVED', 'Seu cadastro de professor ainda está pendente de aprovação pelo administrador.', 403);
        return;
    }
    if (req.user.status === 'BLOQUEADO') {
        (0, response_1.sendError)(res, 'USER_BLOCKED', 'Usuário bloqueado pelo administrador.', 403);
        return;
    }
    next();
}
function requireCanReserve(req, res, next) {
    if (!req.user) {
        (0, response_1.sendError)(res, 'AUTH_REQUIRED', 'Autenticação necessária', 401);
        return;
    }
    if (req.user.role === 'ALUNO') {
        (0, response_1.sendError)(res, 'STUDENT_CANNOT_RESERVE', 'Alunos não têm permissão para criar ou modificar reservas.', 403);
        return;
    }
    if (req.user.role === 'PROFESSOR' && req.user.status === 'PENDENTE') {
        (0, response_1.sendError)(res, 'USER_NOT_APPROVED', 'Professores em estado pendente não podem realizar reservas.', 403);
        return;
    }
    if (req.user.status === 'BLOQUEADO') {
        (0, response_1.sendError)(res, 'USER_BLOCKED', 'Usuário bloqueado não pode realizar reservas.', 403);
        return;
    }
    next();
}
