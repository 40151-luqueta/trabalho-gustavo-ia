import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Equipment } from '../models/Equipment';
import { Lab } from '../models/Lab';
import { sendSuccess, sendError } from '../utils/response';

export async function listEquipments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { laboratorioId } = req.params;
    const filter: any = {};

    if (laboratorioId) {
      filter.laboratorioId = laboratorioId;
    }

    const equipments = await Equipment.find(filter)
      .populate('laboratorioId', 'codigo nome')
      .sort({ nome: 1 });

    sendSuccess(res, { equipamentos: equipments.map((e) => e.toJSON()) });
  } catch (error) {
    next(error);
  }
}

export async function createEquipment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { laboratorioId } = req.params;
    const { nome, tipo, numeroPatrimonio, descricao, status } = req.body;

    if (!nome || !tipo) {
      sendError(res, 'VALIDATION_ERROR', 'Nome e tipo do equipamento são obrigatórios', 400);
      return;
    }

    const lab = await Lab.findById(laboratorioId);
    if (!lab) {
      sendError(res, 'LAB_NOT_FOUND', 'Laboratório não encontrado', 404);
      return;
    }

    const equipment = await Equipment.create({
      laboratorioId: lab._id,
      nome: nome.trim(),
      tipo: tipo.trim(),
      numeroPatrimonio: numeroPatrimonio ? numeroPatrimonio.trim() : '',
      descricao: descricao ? descricao.trim() : '',
      status: status || 'ATIVO'
    });

    sendSuccess(res, { equipamento: equipment.toJSON() }, 201, 'Equipamento cadastrado com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function updateEquipment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { nome, tipo, numeroPatrimonio, descricao, status, laboratorioId } = req.body;

    const equipment = await Equipment.findById(id);
    if (!equipment) {
      sendError(res, 'EQUIPMENT_NOT_FOUND', 'Equipamento não encontrado', 404);
      return;
    }

    if (nome) equipment.nome = nome.trim();
    if (tipo) equipment.tipo = tipo.trim();
    if (numeroPatrimonio !== undefined) equipment.numeroPatrimonio = numeroPatrimonio.trim();
    if (descricao !== undefined) equipment.descricao = descricao.trim();
    if (status) equipment.status = status;
    if (laboratorioId) equipment.laboratorioId = laboratorioId;

    await equipment.save();
    sendSuccess(res, { equipamento: equipment.toJSON() }, 200, 'Equipamento atualizado com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function deleteEquipment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const equipment = await Equipment.findById(id);
    if (!equipment) {
      sendError(res, 'EQUIPMENT_NOT_FOUND', 'Equipamento não encontrado', 404);
      return;
    }

    await Equipment.findByIdAndDelete(id);
    sendSuccess(res, { id }, 200, 'Equipamento excluído com sucesso');
  } catch (error) {
    next(error);
  }
}
