"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEquipments = listEquipments;
exports.createEquipment = createEquipment;
exports.updateEquipment = updateEquipment;
exports.deleteEquipment = deleteEquipment;
const Equipment_1 = require("../models/Equipment");
const Lab_1 = require("../models/Lab");
const response_1 = require("../utils/response");
async function listEquipments(req, res, next) {
    try {
        const { laboratorioId } = req.params;
        const filter = {};
        if (laboratorioId) {
            filter.laboratorioId = laboratorioId;
        }
        const equipments = await Equipment_1.Equipment.find(filter)
            .populate('laboratorioId', 'codigo nome')
            .sort({ nome: 1 });
        (0, response_1.sendSuccess)(res, { equipamentos: equipments.map((e) => e.toJSON()) });
    }
    catch (error) {
        next(error);
    }
}
async function createEquipment(req, res, next) {
    try {
        const { laboratorioId } = req.params;
        const { nome, tipo, numeroPatrimonio, descricao, status } = req.body;
        if (!nome || !tipo) {
            (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'Nome e tipo do equipamento são obrigatórios', 400);
            return;
        }
        const lab = await Lab_1.Lab.findById(laboratorioId);
        if (!lab) {
            (0, response_1.sendError)(res, 'LAB_NOT_FOUND', 'Laboratório não encontrado', 404);
            return;
        }
        const equipment = await Equipment_1.Equipment.create({
            laboratorioId: lab._id,
            nome: nome.trim(),
            tipo: tipo.trim(),
            numeroPatrimonio: numeroPatrimonio ? numeroPatrimonio.trim() : '',
            descricao: descricao ? descricao.trim() : '',
            status: status || 'ATIVO'
        });
        (0, response_1.sendSuccess)(res, { equipamento: equipment.toJSON() }, 201, 'Equipamento cadastrado com sucesso');
    }
    catch (error) {
        next(error);
    }
}
async function updateEquipment(req, res, next) {
    try {
        const { id } = req.params;
        const { nome, tipo, numeroPatrimonio, descricao, status, laboratorioId } = req.body;
        const equipment = await Equipment_1.Equipment.findById(id);
        if (!equipment) {
            (0, response_1.sendError)(res, 'EQUIPMENT_NOT_FOUND', 'Equipamento não encontrado', 404);
            return;
        }
        if (nome)
            equipment.nome = nome.trim();
        if (tipo)
            equipment.tipo = tipo.trim();
        if (numeroPatrimonio !== undefined)
            equipment.numeroPatrimonio = numeroPatrimonio.trim();
        if (descricao !== undefined)
            equipment.descricao = descricao.trim();
        if (status)
            equipment.status = status;
        if (laboratorioId)
            equipment.laboratorioId = laboratorioId;
        await equipment.save();
        (0, response_1.sendSuccess)(res, { equipamento: equipment.toJSON() }, 200, 'Equipamento atualizado com sucesso');
    }
    catch (error) {
        next(error);
    }
}
async function deleteEquipment(req, res, next) {
    try {
        const { id } = req.params;
        const equipment = await Equipment_1.Equipment.findById(id);
        if (!equipment) {
            (0, response_1.sendError)(res, 'EQUIPMENT_NOT_FOUND', 'Equipamento não encontrado', 404);
            return;
        }
        await Equipment_1.Equipment.findByIdAndDelete(id);
        (0, response_1.sendSuccess)(res, { id }, 200, 'Equipamento excluído com sucesso');
    }
    catch (error) {
        next(error);
    }
}
