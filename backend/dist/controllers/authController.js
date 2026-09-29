"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const env_1 = require("../config/env");
const response_1 = require("../utils/response");
function generateToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user._id.toString(),
        role: user.role
    }, env_1.config.jwtSecret, { expiresIn: env_1.config.jwtExpiresIn });
}
async function register(req, res, next) {
    try {
        const { nome, email, senha, role } = req.body;
        if (!nome || !email || !senha) {
            (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'Nome, email e senha são obrigatórios', 400);
            return;
        }
        if (senha.length < 6) {
            (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'A senha deve conter pelo menos 6 caracteres', 400);
            return;
        }
        // Apenas ALUNO ou PROFESSOR podem ser criados pelo registro público
        const selectedRole = role === 'PROFESSOR' ? 'PROFESSOR' : 'ALUNO';
        // Regra de negócio: Professor inicia PENDENTE de aprovação. Aluno inicia ATIVO.
        const initialStatus = selectedRole === 'PROFESSOR' ? 'PENDENTE' : 'ATIVO';
        const existingUser = await User_1.User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            (0, response_1.sendError)(res, 'EMAIL_ALREADY_EXISTS', 'Este endereço de email já está cadastrado', 409);
            return;
        }
        const user = await User_1.User.create({
            nome,
            email,
            senha,
            role: selectedRole,
            status: initialStatus
        });
        const message = selectedRole === 'PROFESSOR'
            ? 'Cadastro realizado com sucesso! Sua conta de professor está aguardando aprovação do administrador.'
            : 'Cadastro realizado com sucesso! Você já pode navegar e visualizar a disponibilidade dos laboratórios.';
        (0, response_1.sendSuccess)(res, {
            usuario: user.toJSON(),
            mensagem: message
        }, 201);
    }
    catch (error) {
        next(error);
    }
}
async function login(req, res, next) {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'Email e senha são obrigatórios', 400);
            return;
        }
        const user = await User_1.User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            (0, response_1.sendError)(res, 'AUTH_INVALID_CREDENTIALS', 'Email ou senha inválidos', 401);
            return;
        }
        const isMatch = await user.comparePassword(senha);
        if (!isMatch) {
            (0, response_1.sendError)(res, 'AUTH_INVALID_CREDENTIALS', 'Email ou senha inválidos', 401);
            return;
        }
        // Verificação de status
        if (user.status === 'BLOQUEADO') {
            (0, response_1.sendError)(res, 'USER_BLOCKED', 'Usuário bloqueado pelo administrador', 403);
            return;
        }
        if (user.role === 'PROFESSOR' && user.status === 'PENDENTE') {
            (0, response_1.sendError)(res, 'USER_NOT_APPROVED', 'Seu cadastro de professor está em análise e aguarda aprovação da administração.', 403);
            return;
        }
        const token = generateToken(user);
        (0, response_1.sendSuccess)(res, {
            token,
            usuario: user.toJSON()
        }, 200, 'Login efetuado com sucesso');
    }
    catch (error) {
        next(error);
    }
}
async function getMe(req, res, next) {
    try {
        if (!req.user) {
            (0, response_1.sendError)(res, 'AUTH_REQUIRED', 'Não autenticado', 401);
            return;
        }
        (0, response_1.sendSuccess)(res, { usuario: req.user.toJSON() });
    }
    catch (error) {
        next(error);
    }
}
