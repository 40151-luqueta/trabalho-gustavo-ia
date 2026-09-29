"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLabs = listLabs;
exports.getLab = getLab;
exports.createLab = createLab;
exports.updateLab = updateLab;
exports.deleteLab = deleteLab;
const Lab_1 = require("../models/Lab");
const Reservation_1 = require("../models/Reservation");
const Equipment_1 = require("../models/Equipment");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
async function listLabs(req, res, next) {
    try {
        const isAdmin = req.user?.role === 'ADMIN';
        const filter = {};
        // Usuários comuns ou visitantes visualizam apenas laboratórios ativos
        if (!isAdmin) {
            filter.ativo = true;
        }
        const labs = await Lab_1.Lab.find(filter).sort({ nome: 1 });
        (0, response_1.sendSuccess)(res, { laboratorios: labs.map((l) => l.toJSON()) });
    }
    catch (error) {
        next(error);
    }
}
async function getLab(req, res, next) {
    try {
        const { id } = req.params;
        const lab = await Lab_1.Lab.findById(id);
        if (!lab) {
            (0, response_1.sendError)(res, 'LAB_NOT_FOUND', 'Laboratório não encontrado', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, { laboratorio: lab.toJSON() });
    }
    catch (error) {
        next(error);
    }
}
async function createLab(req, res, next) {
    try {
        const { codigo, nome, descricao, capacidade, localizacao, ativo } = req.body;
        if (!codigo || !nome || !capacidade) {
            (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'Código, nome e capacidade são obrigatórios', 400);
            return;
        }
        const cleanCode = codigo.toLowerCase().trim();
        const existing = await Lab_1.Lab.findOne({ codigo: cleanCode });
        if (existing) {
            (0, response_1.sendError)(res, 'CODE_ALREADY_EXISTS', 'Já existe um laboratório com este código', 409);
            return;
        }
        const lab = await Lab_1.Lab.create({
            codigo: cleanCode,
            nome: nome.trim(),
            descricao: descricao || '',
            capacidade: Number(capacidade),
            localizacao: localizacao || '',
            ativo: ativo !== undefined ? Boolean(ativo) : true
        });
        (0, response_1.sendSuccess)(res, { laboratorio: lab.toJSON() }, 201, 'Laboratório cadastrado com sucesso');
    }
    catch (error) {
        next(error);
    }
}
async function updateLab(req, res, next) {
    try {
        const { id } = req.params;
        const { codigo, nome, descricao, capacidade, localizacao, ativo } = req.body;
        const lab = await Lab_1.Lab.findById(id);
        if (!lab) {
            (0, response_1.sendError)(res, 'LAB_NOT_FOUND', 'Laboratório não encontrado', 404);
            return;
        }
        if (codigo && codigo.toLowerCase().trim() !== lab.codigo) {
            const existing = await Lab_1.Lab.findOne({ codigo: codigo.toLowerCase().trim() });
            if (existing) {
                (0, response_1.sendError)(res, 'CODE_ALREADY_EXISTS', 'Código já utilizado por outro laboratório', 409);
                return;
            }
            lab.codigo = codigo.toLowerCase().trim();
        }
        if (nome)
            lab.nome = nome.trim();
        if (descricao !== undefined)
            lab.descricao = descricao.trim();
        if (capacidade !== undefined)
            lab.capacidade = Number(capacidade);
        if (localizacao !== undefined)
            lab.localizacao = localizacao.trim();
        if (ativo !== undefined)
            lab.ativo = Boolean(ativo);
        await lab.save();
        (0, response_1.sendSuccess)(res, { laboratorio: lab.toJSON() }, 200, 'Laboratório atualizado com sucesso');
    }
    catch (error) {
        next(error);
    }
}
async function deleteLab(req, res, next) {
    try {
        const { id } = req.params;
        const lab = await Lab_1.Lab.findById(id);
        if (!lab) {
            (0, response_1.sendError)(res, 'LAB_NOT_FOUND', 'Laboratório não encontrado', 404);
            return;
        }
        // Verificar se existem reservas confirmadas para este laboratório
        const activeReservations = await Reservation_1.Reservation.countDocuments({
            laboratorioId: lab._id,
            status: 'CONFIRMADA'
        });
        if (activeReservations > 0) {
            throw new errorHandler_1.AppError(`Não é possível excluir o laboratório pois existem ${activeReservations} reserva(s) confirmada(s). Você pode desativá-lo em vez de excluí-lo.`, 400, 'LAB_HAS_ACTIVE_RESERVATIONS');
        }
        // Excluir também equipamentos vinculados a este laboratório
        await Equipment_1.Equipment.deleteMany({ laboratorioId: lab._id });
        await Lab_1.Lab.findByIdAndDelete(id);
        (0, response_1.sendSuccess)(res, { id }, 200, 'Laboratório excluído com sucesso');
    }
    catch (error) {
        next(error);
    }
}
