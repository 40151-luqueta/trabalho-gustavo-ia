import mongoose from 'mongoose';
import { Reservation, IReservation } from '../models/Reservation';
import { Lab } from '../models/Lab';
import { User, IUser } from '../models/User';
import { SystemSettings, ISystemSettings } from '../models/SystemSettings';
import { ReservationRule } from '../models/ReservationRule';
import { AppError } from '../middleware/errorHandler';
import {
  isValidDateFormat,
  calculateDaysDifference,
  getDayOfWeek,
  getDayOfWeekName,
  getWeekOfMonth,
  getTodayDateString,
  getCurrentTimeString
} from '../utils/dateUtils';

export interface CreateReservationInput {
  laboratorioId: string;
  data: string; // 'YYYY-MM-DD'
  aula: number;
  observacao?: string;
  finalidade?: string;
  usuario: IUser;
}

export interface ReservationValidationResult {
  allowed: boolean;
  reason?: string;
  isException?: boolean;
}

export class ReservationService {
  /**
   * Avalia a elegibilidade de uma reserva e retorna o motivo em caso de aprovação ou recusa.
   */
  static async evaluateEligibility(
    input: CreateReservationInput,
    settings?: ISystemSettings
  ): Promise<ReservationValidationResult> {
    const { laboratorioId, data, aula, usuario } = input;
    const sysSettings = settings || (await SystemSettings.getSettings());

    // 1. Validação de usuário
    if (usuario.status === 'BLOQUEADO') {
      return { allowed: false, reason: 'Usuário bloqueado pelo administrador.' };
    }
    if (usuario.role === 'ALUNO') {
      return { allowed: false, reason: 'Alunos não têm permissão para criar reservas.' };
    }
    if (usuario.role === 'PROFESSOR' && usuario.status === 'PENDENTE') {
      return { allowed: false, reason: 'Seu cadastro de professor ainda está pendente de aprovação.' };
    }

    // 2. Validação da data
    if (!isValidDateFormat(data)) {
      return { allowed: false, reason: 'Formato de data inválido. Utilize o formato YYYY-MM-DD.' };
    }

    const todayStr = getTodayDateString(sysSettings.timezone);
    const diffDays = calculateDaysDifference(data, todayStr, sysSettings.timezone);

    if (diffDays < 0) {
      return { allowed: false, reason: 'Não é possível realizar reservas para datas passadas.' };
    }

    // 3. Validação de dia letivo
    const dayOfWeek = getDayOfWeek(data);
    if (!sysSettings.schoolDays.includes(dayOfWeek)) {
      return {
        allowed: false,
        reason: `Reservas são permitidas apenas em dias letivos (segunda a sexta-feira). A data selecionada é um ${getDayOfWeekName(dayOfWeek)}.`
      };
    }

    // 4. Validação da janela máxima de agendamento
    const maxWindowDays = sysSettings.reservationWindowWeeks * 7;
    if (diffDays > maxWindowDays) {
      return {
        allowed: false,
        reason: `Esta data está fora da sua janela de programação permitida de ${sysSettings.reservationWindowWeeks} semanas.`
      };
    }

    // 5. Validação da aula
    const lesson = sysSettings.lessons.find((l) => l.numero === Number(aula));
    if (!lesson) {
      return {
        allowed: false,
        reason: `Aula ${aula} inválida. O sistema possui as aulas de 1 a ${sysSettings.lessons.length}.`
      };
    }

    // 5.1. Validação de horário já passado no dia atual
    if (diffDays === 0) {
      const currentTime = getCurrentTimeString(sysSettings.timezone);
      if (currentTime >= lesson.horarioInicio) {
        return {
          allowed: false,
          reason: `Não é possível realizar reservas para horários que já passaram. A ${lesson.nome} iniciou às ${lesson.horarioInicio}.`
        };
      }
    }

    // 6. Validação do laboratório
    if (!mongoose.Types.ObjectId.isValid(laboratorioId)) {
      return { allowed: false, reason: 'Identificador do laboratório inválido.' };
    }
    const lab = await Lab.findById(laboratorioId);
    if (!lab) {
      return { allowed: false, reason: 'Laboratório não encontrado.' };
    }
    if (!lab.ativo) {
      return { allowed: false, reason: `O laboratório ${lab.nome} está desativado para reservas.` };
    }

    // 7. Se for Administrador: possui permissão direta
    if (usuario.role === 'ADMIN') {
      return { allowed: true };
    }

    // 8. Se for Professor: verificar regras e exceção de antecedência
    const isWithinExceptionWindow = diffDays <= sysSettings.exceptionAdvanceDays;

    // Buscar regras ativas cadastradas para este professor
    const rules = await ReservationRule.find({
      professorId: usuario._id,
      ativo: true
    });

    // Se o professor possui regras específicas cadastradas:
    if (rules.length > 0) {
      const targetDateObj = new Date(data + 'T00:00:00Z');
      const weekOfMonth = getWeekOfMonth(data);

      const matchesAnyRule = rules.some((rule) => {
        // Valida dia da semana
        if (!rule.diasSemana.includes(dayOfWeek)) return false;

        // Valida semana específica se configurada
        if (rule.semanas && rule.semanas.length > 0 && !rule.semanas.includes(weekOfMonth)) {
          return false;
        }

        // Valida período dataInicio / dataFim se configurado
        if (rule.dataInicio && targetDateObj < rule.dataInicio) return false;
        if (rule.dataFim && targetDateObj > rule.dataFim) return false;

        // Valida laboratório se restrito
        if (
          rule.laboratoriosPermitidos &&
          rule.laboratoriosPermitidos.length > 0 &&
          !rule.laboratoriosPermitidos.some((lId) => lId.toString() === lab._id.toString())
        ) {
          return false;
        }

        return true;
      });

      if (!matchesAnyRule) {
        // Se não possui regra para este dia, checar se a exceção de antecedência cobre!
        if (isWithinExceptionWindow) {
          return {
            allowed: true,
            isException: true,
            reason: `Reserva autorizada pela regra de antecedência excepcional (até ${sysSettings.exceptionAdvanceDays} dia(s) antes).`
          };
        }

        const dayName = getDayOfWeekName(dayOfWeek);
        return {
          allowed: false,
          reason: `Você não possui autorização regular para este dia (${dayName}). Porém, a regra de antecedência excepcional permite reservas até ${sysSettings.exceptionAdvanceDays} dia(s) antes da data desejada.`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Cria uma reserva garantindo consistência e bloqueio de conflitos concorrentes.
   */
  static async createReservation(input: CreateReservationInput): Promise<IReservation> {
    const settings = await SystemSettings.getSettings();

    // 1. Validação de elegibilidade pelas regras de negócio
    const evaluation = await this.evaluateEligibility(input, settings);
    if (!evaluation.allowed) {
      throw new AppError(evaluation.reason || 'Reserva não permitida.', 403, 'RESERVATION_NOT_ALLOWED');
    }

    // 2. Verificação prévia de conflito no banco
    const existing = await Reservation.findOne({
      laboratorioId: input.laboratorioId,
      data: input.data,
      aula: input.aula,
      status: 'CONFIRMADA'
    });

    if (existing) {
      throw new AppError(
        'Não é possível reservar este horário porque o laboratório já está ocupado.',
        409,
        'RESERVATION_CONFLICT'
      );
    }

    // 3. Persistência da reserva (o índice único composto no MongoDB garante concorrência atômica)
    try {
      const reservation = await Reservation.create({
        laboratorioId: input.laboratorioId,
        usuarioId: input.usuario._id,
        data: input.data,
        aula: input.aula,
        status: 'CONFIRMADA',
        observacao: input.observacao || '',
        finalidade: input.finalidade || ''
      });

      return reservation;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new AppError(
          'Não é possível reservar este horário porque o laboratório já está ocupado.',
          409,
          'RESERVATION_CONFLICT'
        );
      }
      throw err;
    }
  }

  /**
   * Cancela uma reserva existente. Apenas o professor dono ou administrador podem cancelar.
   */
  static async cancelReservation(reservationId: string, usuario: IUser): Promise<IReservation> {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new AppError('Reserva não encontrada.', 404, 'RESERVATION_NOT_FOUND');
    }

    if (reservation.status === 'CANCELADA') {
      throw new AppError('Esta reserva já se encontra cancelada.', 400, 'RESERVATION_ALREADY_CANCELLED');
    }

    // Permissão: ADMIN pode cancelar qualquer reserva; PROFESSOR só pode cancelar a sua
    const isOwner = reservation.usuarioId.toString() === usuario._id.toString();
    const isAdmin = usuario.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new AppError('Você não tem permissão para cancelar esta reserva.', 403, 'AUTH_FORBIDDEN');
    }

    reservation.status = 'CANCELADA';
    await reservation.save();

    return reservation;
  }
}
