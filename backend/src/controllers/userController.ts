import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User, IUser, UserRole, UserStatus } from '../models/User';
import { Reservation } from '../models/Reservation';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, status, busca } = req.query;

    const filter: any = {};
    if (role && ['ALUNO', 'PROFESSOR', 'ADMIN'].includes(role as string)) {
      filter.role = role;
    }
    if (status && ['PENDENTE', 'ATIVO', 'BLOQUEADO'].includes(status as string)) {
      filter.status = status;
    }
    if (busca && typeof busca === 'string') {
      const searchRegex = new RegExp(busca.trim(), 'i');
      filter.$or = [{ nome: searchRegex }, { email: searchRegex }];
    }

    const users = await User.find(filter).sort({ criadoEm: -1 });
    sendSuccess(res, { usuarios: users.map((u) => u.toJSON()) });
  } catch (error) {
    next(error);
  }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'Usuário não encontrado', 404);
      return;
    }
    sendSuccess(res, { usuario: user.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nome, email, senha, role, status } = req.body;

    if (!nome || !email || !senha) {
      sendError(res, 'VALIDATION_ERROR', 'Nome, email e senha são obrigatórios', 400);
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      sendError(res, 'EMAIL_ALREADY_EXISTS', 'Este endereço de email já está cadastrado', 409);
      return;
    }

    const user = await User.create({
      nome,
      email,
      senha,
      role: role || 'ALUNO',
      status: status || (role === 'PROFESSOR' ? 'PENDENTE' : 'ATIVO')
    });

    sendSuccess(res, { usuario: user.toJSON() }, 201, 'Usuário cadastrado com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function approveProfessor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'Usuário não encontrado', 404);
      return;
    }

    if (user.role !== 'PROFESSOR') {
      sendError(res, 'INVALID_OPERATION', 'Apenas professores podem ser aprovados', 400);
      return;
    }

    user.status = 'ATIVO';
    await user.save();

    sendSuccess(res, { usuario: user.toJSON() }, 200, 'Professor aprovado com sucesso!');
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { nome, email, role, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'Usuário não encontrado', 404);
      return;
    }

    // Regra de segurança fundamental: proteção do último administrador
    // Se o usuário atual for ADMIN e a operação tentar alterar seu papel ou status para não-ativo:
    const isTargetAdmin = user.role === 'ADMIN' && user.status === 'ATIVO';
    const willLoseAdmin = (role && role !== 'ADMIN') || (status && status !== 'ATIVO');

    if (isTargetAdmin && willLoseAdmin) {
      const activeAdminsCount = await User.countDocuments({
        role: 'ADMIN',
        status: 'ATIVO'
      });

      if (activeAdminsCount <= 1) {
        throw new AppError(
          'Operação rejeitada: o sistema deve possuir pelo menos um administrador ativo.',
          400,
          'CANNOT_DEMOTE_LAST_ADMIN'
        );
      }
    }

    if (nome) user.nome = nome.trim();
    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        sendError(res, 'EMAIL_ALREADY_EXISTS', 'Email já cadastrado em outra conta', 409);
        return;
      }
      user.email = email.toLowerCase().trim();
    }
    if (role && ['ALUNO', 'PROFESSOR', 'ADMIN'].includes(role)) {
      user.role = role as UserRole;
    }
    if (status && ['PENDENTE', 'ATIVO', 'BLOQUEADO'].includes(status)) {
      user.status = status as UserStatus;
    }

    await user.save();
    sendSuccess(res, { usuario: user.toJSON() }, 200, 'Usuário atualizado com sucesso');
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'Usuário não encontrado', 404);
      return;
    }

    // Regra de segurança fundamental: proteção contra exclusão do último administrador
    if (user.role === 'ADMIN') {
      const activeAdminsCount = await User.countDocuments({
        role: 'ADMIN',
        status: 'ATIVO'
      });

      if (activeAdminsCount <= 1) {
        throw new AppError(
          'Operação rejeitada: você não pode excluir o único administrador ativo do sistema.',
          400,
          'CANNOT_DELETE_LAST_ADMIN'
        );
      }
    }

    // Cancelar reservas ativas deste usuário antes de excluir
    await Reservation.updateMany(
      { usuarioId: user._id, status: 'CONFIRMADA' },
      { $set: { status: 'CANCELADA' } }
    );

    await User.findByIdAndDelete(id);

    sendSuccess(res, { id }, 200, 'Usuário excluído com sucesso');
  } catch (error) {
    next(error);
  }
}
