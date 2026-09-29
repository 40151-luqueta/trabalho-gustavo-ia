"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const User_1 = require("../models/User");
const response_1 = require("../utils/response");
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            (0, response_1.sendError)(res, 'AUTH_TOKEN_MISSING', 'Token de autenticação não fornecido', 401);
            return;
        }
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        }
        catch (err) {
            if (err.name === 'TokenExpiredError') {
                (0, response_1.sendError)(res, 'AUTH_TOKEN_EXPIRED', 'Token expirado. Por favor, faça login novamente.', 401);
                return;
            }
            (0, response_1.sendError)(res, 'AUTH_TOKEN_INVALID', 'Token inválido', 401);
            return;
        }
        const user = await User_1.User.findById(decoded.id);
        if (!user) {
            (0, response_1.sendError)(res, 'USER_NOT_FOUND', 'Usuário não encontrado', 401);
            return;
        }
        if (user.status === 'BLOQUEADO') {
            (0, response_1.sendError)(res, 'USER_BLOCKED', 'Usuário bloqueado pelo administrador', 403);
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        next(error);
    }
}
