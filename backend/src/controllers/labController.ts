import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Lab } from '../models/Lab';
import { Reservation } from '../models/Reservation';
import { Equipment } from '../models/Equipment';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export async function listLabs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const filter: any = {};

    // Usuários comuns ou visitantes visualizam apenas laboratórios ativos
    if (!isAdmin) {
      filter.ativo = true;
    }

    const labs = await Lab.find(filter).sort({ nome: 1 });
    sendSuccess(res, { laboratorios: labs.map((l) => l.toJSON()) });
  } catch (error) {
    next(error);
  }
}

export async function getLab(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const lab = await Lab.findById(id);
    if (!lab) {
      sendError(res, 'LAB_NOT_FOUND', 'Laboratório não encontrado', 404);
      return;
    }
    sendSuccess(res, { laboratorio: lab.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function createLab(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { codigo, nome, descricao, capacidade, localizacao, ativo } = req.body;

    if (!codigo || !nome || !capacidade) {
      sendError(res, 'VALIDATION_ERROR', 'Código, nome e capacidade são obrigatórios', 400);
      return;
    }

    const cleanCode = codigo.toLowerCase().trim();
    const existing = await Lab.findOne({ codigo: cleanCode });
    if (existing) {
      sendError(res, 'CODE_ALREADY_EXISTS', 'Já existe um laboratório com este código', 409);
      return;
    }

    const lab = await Lab.create({
      codigo: cleanCode,
      nome: nome.trim(),
      descricao: descricao || '',
      capacidade: Number(capacidade),
      localizacao: localizacao || '',
      ativo: ativo !== undefined ? Boolean(ativo) : true
    });

    sendSuccess(res, { laboratorio: lab.toJSON() }, 201, 'Laboratório cadastrado com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function updateLab(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { codigo, nome, descricao, capacidade, localizacao, ativo } = req.body;

    const lab = await Lab.findById(id);
    if (!lab) {
      sendError(res, 'LAB_NOT_FOUND', 'Laboratório não encontrado', 404);
      return;
    }

    if (codigo && codigo.toLowerCase().trim() !== lab.codigo) {
      const existing = await Lab.findOne({ codigo: codigo.toLowerCase().trim() });
      if (existing) {
        sendError(res, 'CODE_ALREADY_EXISTS', 'Código já utilizado por outro laboratório', 409);
        return;
      }
      lab.codigo = codigo.toLowerCase().trim();
    }

    if (nome) lab.nome = nome.trim();
    if (descricao !== undefined) lab.descricao = descricao.trim();
    if (capacidade !== undefined) lab.capacidade = Number(capacidade);
    if (localizacao !== undefined) lab.localizacao = localizacao.trim();
    if (ativo !== undefined) lab.ativo = Boolean(ativo);

    await lab.save();
    sendSuccess(res, { laboratorio: lab.toJSON() }, 200, 'Laboratório atualizado com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function deleteLab(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const lab = await Lab.findById(id);
    if (!lab) {
      sendError(res, 'LAB_NOT_FOUND', 'Laboratório não encontrado', 404);
      return;
    }

    // Verificar se existem reservas confirmadas para este laboratório
    const activeReservations = await Reservation.countDocuments({
      laboratorioId: lab._id,
      status: 'CONFIRMADA'
    });

    if (activeReservations > 0) {
      throw new AppError(
        `Não é possível excluir o laboratório pois existem ${activeReservations} reserva(s) confirmada(s). Você pode desativá-lo em vez de excluí-lo.`,
        400,
        'LAB_HAS_ACTIVE_RESERVATIONS'
      );
    }

    // Excluir também equipamentos vinculados a este laboratório
    await Equipment.deleteMany({ laboratorioId: lab._id });
    await Lab.findByIdAndDelete(id);

    sendSuccess(res, { id }, 200, 'Laboratório excluído com sucesso');
  } catch (error) {
    next(error);
  }
}
