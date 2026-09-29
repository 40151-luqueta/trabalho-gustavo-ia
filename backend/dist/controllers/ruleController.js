"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRules = listRules;
exports.createRule = createRule;
exports.updateRule = updateRule;
exports.deleteRule = deleteRule;
const ReservationRule_1 = require("../models/ReservationRule");
const User_1 = require("../models/User");
const response_1 = require("../utils/response");
async function listRules(req, res, next) {
    try {
        const filter = {};
        if (req.user?.role === 'PROFESSOR') {
            filter.professorId = req.user._id;
        }
        else if (req.query.professorId) {
            filter.professorId = req.query.professorId;
        }
        const rules = await ReservationRule_1.ReservationRule.find(filter)
            .populate('professorId', 'nome email')
            .populate('laboratoriosPermitidos', 'codigo nome')
            .sort({ criadoEm: -1 });
        (0, response_1.sendSuccess)(res, { regras: rules.map((r) => r.toJSON()) });
    }
    catch (error) {
        next(error);
    }
}
async function createRule(req, res, next) {
    try {
        const { professorId, nome, tipo, diasSemana, semanas, dataInicio, dataFim, laboratoriosPermitidos, ativo } = req.body;
        if (!professorId || !nome || !diasSemana || !Array.isArray(diasSemana) || diasSemana.length === 0) {
            (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'Professor, nome da regra e dias da semana são obrigatórios', 400);
            return;
        }
        const teacher = await User_1.User.findById(professorId);
        if (!teacher || teacher.role !== 'PROFESSOR') {
            (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'O usuário indicado deve ser um professor válido', 400);
            return;
        }
        const rule = await ReservationRule_1.ReservationRule.create({
            professorId,
            nome: nome.trim(),
            tipo: tipo || 'RECORRENTE',
            diasSemana,
            semanas: semanas || [],
            dataInicio: dataInicio ? new Date(dataInicio) : undefined,
            dataFim: dataFim ? new Date(dataFim) : undefined,
            laboratoriosPermitidos: laboratoriosPermitidos || [],
            ativo: ativo !== undefined ? Boolean(ativo) : true
        });
        const populated = await ReservationRule_1.ReservationRule.findById(rule._id)
            .populate('professorId', 'nome email')
            .populate('laboratoriosPermitidos', 'codigo nome');
        (0, response_1.sendSuccess)(res, { regra: populated?.toJSON() }, 201, 'Regra de reserva cadastrada com sucesso');
    }
    catch (error) {
        next(error);
    }
}
async function updateRule(req, res, next) {
    try {
        const { id } = req.params;
        const { nome, tipo, diasSemana, semanas, dataInicio, dataFim, laboratoriosPermitidos, ativo } = req.body;
        const rule = await ReservationRule_1.ReservationRule.findById(id);
        if (!rule) {
            (0, response_1.sendError)(res, 'RULE_NOT_FOUND', 'Regra de reserva não encontrada', 404);
            return;
        }
        if (nome)
            rule.nome = nome.trim();
        if (tipo)
            rule.tipo = tipo;
        if (diasSemana && Array.isArray(diasSemana))
            rule.diasSemana = diasSemana;
        if (semanas !== undefined)
            rule.semanas = semanas;
        if (dataInicio !== undefined)
            rule.dataInicio = dataInicio ? new Date(dataInicio) : undefined;
        if (dataFim !== undefined)
            rule.dataFim = dataFim ? new Date(dataFim) : undefined;
        if (laboratoriosPermitidos !== undefined)
            rule.laboratoriosPermitidos = laboratoriosPermitidos;
        if (ativo !== undefined)
            rule.ativo = Boolean(ativo);
        await rule.save();
        const populated = await ReservationRule_1.ReservationRule.findById(rule._id)
            .populate('professorId', 'nome email')
            .populate('laboratoriosPermitidos', 'codigo nome');
        (0, response_1.sendSuccess)(res, { regra: populated?.toJSON() }, 200, 'Regra de reserva atualizada com sucesso');
    }
    catch (error) {
        next(error);
    }
}
async function deleteRule(req, res, next) {
    try {
        const { id } = req.params;
        const rule = await ReservationRule_1.ReservationRule.findById(id);
        if (!rule) {
            (0, response_1.sendError)(res, 'RULE_NOT_FOUND', 'Regra não encontrada', 404);
            return;
        }
        await ReservationRule_1.ReservationRule.findByIdAndDelete(id);
        (0, response_1.sendSuccess)(res, { id }, 200, 'Regra excluída com sucesso');
    }
    catch (error) {
        next(error);
    }
}
