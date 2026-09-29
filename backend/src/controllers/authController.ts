import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole, UserStatus } from '../models/User';
import { config } from '../config/env';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

function generateToken(user: IUser): string {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nome, email, senha, role } = req.body;

    if (!nome || !email || !senha) {
      sendError(res, 'VALIDATION_ERROR', 'Nome, email e senha são obrigatórios', 400);
      return;
    }

    if (senha.length < 6) {
      sendError(res, 'VALIDATION_ERROR', 'A senha deve conter pelo menos 6 caracteres', 400);
      return;
    }

    // Apenas ALUNO ou PROFESSOR podem ser criados pelo registro público
    const selectedRole: UserRole = role === 'PROFESSOR' ? 'PROFESSOR' : 'ALUNO';

    // Regra de negócio: Professor inicia PENDENTE de aprovação. Aluno inicia ATIVO.
    const initialStatus: UserStatus = selectedRole === 'PROFESSOR' ? 'PENDENTE' : 'ATIVO';

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      sendError(res, 'EMAIL_ALREADY_EXISTS', 'Este endereço de email já está cadastrado', 409);
      return;
    }

    const user = await User.create({
      nome,
      email,
      senha,
      role: selectedRole,
      status: initialStatus
    });

    const message =
      selectedRole === 'PROFESSOR'
        ? 'Cadastro realizado com sucesso! Sua conta de professor está aguardando aprovação do administrador.'
        : 'Cadastro realizado com sucesso! Você já pode navegar e visualizar a disponibilidade dos laboratórios.';

    sendSuccess(
      res,
      {
        usuario: user.toJSON(),
        mensagem: message
      },
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      sendError(res, 'VALIDATION_ERROR', 'Email e senha são obrigatórios', 400);
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      sendError(res, 'AUTH_INVALID_CREDENTIALS', 'Email ou senha inválidos', 401);
      return;
    }

    const isMatch = await user.comparePassword(senha);
    if (!isMatch) {
      sendError(res, 'AUTH_INVALID_CREDENTIALS', 'Email ou senha inválidos', 401);
      return;
    }

    // Verificação de status
    if (user.status === 'BLOQUEADO') {
      sendError(res, 'USER_BLOCKED', 'Usuário bloqueado pelo administrador', 403);
      return;
    }

    if (user.role === 'PROFESSOR' && user.status === 'PENDENTE') {
      sendError(
        res,
        'USER_NOT_APPROVED',
        'Seu cadastro de professor está em análise e aguarda aprovação da administração.',
        403
      );
      return;
    }

    const token = generateToken(user);

    sendSuccess(
      res,
      {
        token,
        usuario: user.toJSON()
      },
      200,
      'Login efetuado com sucesso'
    );
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'AUTH_REQUIRED', 'Não autenticado', 401);
      return;
    }

    sendSuccess(res, { usuario: req.user.toJSON() });
  } catch (error) {
    next(error);
  }
}
