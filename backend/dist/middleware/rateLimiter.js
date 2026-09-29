"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite razoável para desenvolvimento/testes/produção
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Muitas tentativas de autenticação. Por favor, tente novamente após 15 minutos.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});
