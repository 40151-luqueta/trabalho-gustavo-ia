import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ReservationRule } from '../models/ReservationRule';
import { User } from '../models/User';
import { sendSuccess, sendError } from '../utils/response';

export async function listRules(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter: any = {};

    if (req.user?.role === 'PROFESSOR') {
      filter.professorId = req.user._id;
    } else if (req.query.professorId) {
      filter.professorId = req.query.professorId;
    }

    const rules = await ReservationRule.find(filter)
      .populate('professorId', 'nome email')
      .populate('laboratoriosPermitidos', 'codigo nome')
      .sort({ criadoEm: -1 });

    sendSuccess(res, { regras: rules.map((r) => r.toJSON()) });
  } catch (error) {
    next(error);
  }
}

export async function createRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { professorId, nome, tipo, diasSemana, semanas, dataInicio, dataFim, laboratoriosPermitidos, ativo } =
      req.body;

    if (!professorId || !nome || !diasSemana || !Array.isArray(diasSemana) || diasSemana.length === 0) {
      sendError(res, 'VALIDATION_ERROR', 'Professor, nome da regra e dias da semana são obrigatórios', 400);
      return;
    }

    const teacher = await User.findById(professorId);
    if (!teacher || teacher.role !== 'PROFESSOR') {
      sendError(res, 'VALIDATION_ERROR', 'O usuário indicado deve ser um professor válido', 400);
      return;
    }

    const rule = await ReservationRule.create({
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

    const populated = await ReservationRule.findById(rule._id)
      .populate('professorId', 'nome email')
      .populate('laboratoriosPermitidos', 'codigo nome');

    sendSuccess(res, { regra: populated?.toJSON() }, 201, 'Regra de reserva cadastrada com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function updateRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { nome, tipo, diasSemana, semanas, dataInicio, dataFim, laboratoriosPermitidos, ativo } = req.body;

    const rule = await ReservationRule.findById(id);
    if (!rule) {
      sendError(res, 'RULE_NOT_FOUND', 'Regra de reserva não encontrada', 404);
      return;
    }

    if (nome) rule.nome = nome.trim();
    if (tipo) rule.tipo = tipo;
    if (diasSemana && Array.isArray(diasSemana)) rule.diasSemana = diasSemana;
    if (semanas !== undefined) rule.semanas = semanas;
    if (dataInicio !== undefined) rule.dataInicio = dataInicio ? new Date(dataInicio) : undefined;
    if (dataFim !== undefined) rule.dataFim = dataFim ? new Date(dataFim) : undefined;
    if (laboratoriosPermitidos !== undefined) rule.laboratoriosPermitidos = laboratoriosPermitidos;
    if (ativo !== undefined) rule.ativo = Boolean(ativo);

    await rule.save();

    const populated = await ReservationRule.findById(rule._id)
      .populate('professorId', 'nome email')
      .populate('laboratoriosPermitidos', 'codigo nome');

    sendSuccess(res, { regra: populated?.toJSON() }, 200, 'Regra de reserva atualizada com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function deleteRule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const rule = await ReservationRule.findById(id);
    if (!rule) {
      sendError(res, 'RULE_NOT_FOUND', 'Regra não encontrada', 404);
      return;
    }

    await ReservationRule.findByIdAndDelete(id);
    sendSuccess(res, { id }, 200, 'Regra excluída com sucesso');
  } catch (error) {
    next(error);
  }
}
