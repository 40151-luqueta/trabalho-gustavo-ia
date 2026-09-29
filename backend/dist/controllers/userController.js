"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.getUser = getUser;
exports.createUser = createUser;
exports.approveProfessor = approveProfessor;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
const User_1 = require("../models/User");
const Reservation_1 = require("../models/Reservation");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
async function listUsers(req, res, next) {
    try {
        const { role, status, busca } = req.query;
        const filter = {};
        if (role && ['ALUNO', 'PROFESSOR', 'ADMIN'].includes(role)) {
            filter.role = role;
        }
        if (status && ['PENDENTE', 'ATIVO', 'BLOQUEADO'].includes(status)) {
            filter.status = status;
        }
        if (busca && typeof busca === 'string') {
            const searchRegex = new RegExp(busca.trim(), 'i');
            filter.$or = [{ nome: searchRegex }, { email: searchRegex }];
        }
        const users = await User_1.User.find(filter).sort({ criadoEm: -1 });
        (0, response_1.sendSuccess)(res, { usuarios: users.map((u) => u.toJSON()) });
    }
    catch (error) {
        next(error);
    }
}
async function getUser(req, res, next) {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id);
        if (!user) {
            (0, response_1.sendError)(res, 'USER_NOT_FOUND', 'Usuário não encontrado', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, { usuario: user.toJSON() });
    }
    catch (error) {
        next(error);
    }
}
async function createUser(req, res, next) {
    try {
        const { nome, email, senha, role, status } = req.body;
        if (!nome || !email || !senha) {
            (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'Nome, email e senha são obrigatórios', 400);
            return;
        }
        const existing = await User_1.User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            (0, response_1.sendError)(res, 'EMAIL_ALREADY_EXISTS', 'Este endereço de email já está cadastrado', 409);
            return;
        }
        const user = await User_1.User.create({
            nome,
            email,
            senha,
            role: role || 'ALUNO',
            status: status || (role === 'PROFESSOR' ? 'PENDENTE' : 'ATIVO')
        });
        (0, response_1.sendSuccess)(res, { usuario: user.toJSON() }, 201, 'Usuário cadastrado com sucesso');
    }
    catch (error) {
        next(error);
    }
}
async function approveProfessor(req, res, next) {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id);
        if (!user) {
            (0, response_1.sendError)(res, 'USER_NOT_FOUND', 'Usuário não encontrado', 404);
            return;
        }
        if (user.role !== 'PROFESSOR') {
            (0, response_1.sendError)(res, 'INVALID_OPERATION', 'Apenas professores podem ser aprovados', 400);
            return;
        }
        user.status = 'ATIVO';
        await user.save();
        (0, response_1.sendSuccess)(res, { usuario: user.toJSON() }, 200, 'Professor aprovado com sucesso!');
    }
    catch (error) {
        next(error);
    }
}
async function updateUser(req, res, next) {
    try {
        const { id } = req.params;
        const { nome, email, role, status } = req.body;
        const user = await User_1.User.findById(id);
        if (!user) {
            (0, response_1.sendError)(res, 'USER_NOT_FOUND', 'Usuário não encontrado', 404);
            return;
        }
        // Regra de segurança fundamental: proteção do último administrador
        // Se o usuário atual for ADMIN e a operação tentar alterar seu papel ou status para não-ativo:
        const isTargetAdmin = user.role === 'ADMIN' && user.status === 'ATIVO';
        const willLoseAdmin = (role && role !== 'ADMIN') || (status && status !== 'ATIVO');
        if (isTargetAdmin && willLoseAdmin) {
            const activeAdminsCount = await User_1.User.countDocuments({
                role: 'ADMIN',
                status: 'ATIVO'
            });
            if (activeAdminsCount <= 1) {
                throw new errorHandler_1.AppError('Operação rejeitada: o sistema deve possuir pelo menos um administrador ativo.', 400, 'CANNOT_DEMOTE_LAST_ADMIN');
            }
        }
        if (nome)
            user.nome = nome.trim();
        if (email && email.toLowerCase().trim() !== user.email) {
            const existing = await User_1.User.findOne({ email: email.toLowerCase().trim() });
            if (existing) {
                (0, response_1.sendError)(res, 'EMAIL_ALREADY_EXISTS', 'Email já cadastrado em outra conta', 409);
                return;
            }
            user.email = email.toLowerCase().trim();
        }
        if (role && ['ALUNO', 'PROFESSOR', 'ADMIN'].includes(role)) {
            user.role = role;
        }
        if (status && ['PENDENTE', 'ATIVO', 'BLOQUEADO'].includes(status)) {
            user.status = status;
        }
        await user.save();
        (0, response_1.sendSuccess)(res, { usuario: user.toJSON() }, 200, 'Usuário atualizado com sucesso');
    }
    catch (error) {
        next(error);
    }
}
async function deleteUser(req, res, next) {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id);
        if (!user) {
            (0, response_1.sendError)(res, 'USER_NOT_FOUND', 'Usuário não encontrado', 404);
            return;
        }
        // Regra de segurança fundamental: proteção contra exclusão do último administrador
        if (user.role === 'ADMIN') {
            const activeAdminsCount = await User_1.User.countDocuments({
                role: 'ADMIN',
                status: 'ATIVO'
            });
            if (activeAdminsCount <= 1) {
                throw new errorHandler_1.AppError('Operação rejeitada: você não pode excluir o único administrador ativo do sistema.', 400, 'CANNOT_DELETE_LAST_ADMIN');
            }
        }
        // Cancelar reservas ativas deste usuário antes de excluir
        await Reservation_1.Reservation.updateMany({ usuarioId: user._id, status: 'CONFIRMADA' }, { $set: { status: 'CANCELADA' } });
        await User_1.User.findByIdAndDelete(id);
        (0, response_1.sendSuccess)(res, { id }, 200, 'Usuário excluído com sucesso');
    }
    catch (error) {
        next(error);
    }
}
