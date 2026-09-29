"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Reservation_1 = require("../models/Reservation");
const Lab_1 = require("../models/Lab");
const SystemSettings_1 = require("../models/SystemSettings");
const ReservationRule_1 = require("../models/ReservationRule");
const errorHandler_1 = require("../middleware/errorHandler");
const dateUtils_1 = require("../utils/dateUtils");
class ReservationService {
    /**
     * Avalia a elegibilidade de uma reserva e retorna o motivo em caso de aprovação ou recusa.
     */
    static async evaluateEligibility(input, settings) {
        const { laboratorioId, data, aula, usuario } = input;
        const sysSettings = settings || (await SystemSettings_1.SystemSettings.getSettings());
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
        if (!(0, dateUtils_1.isValidDateFormat)(data)) {
            return { allowed: false, reason: 'Formato de data inválido. Utilize o formato YYYY-MM-DD.' };
        }
        const todayStr = (0, dateUtils_1.getTodayDateString)(sysSettings.timezone);
        const diffDays = (0, dateUtils_1.calculateDaysDifference)(data, todayStr, sysSettings.timezone);
        if (diffDays < 0) {
            return { allowed: false, reason: 'Não é possível realizar reservas para datas passadas.' };
        }
        // 3. Validação de dia letivo
        const dayOfWeek = (0, dateUtils_1.getDayOfWeek)(data);
        if (!sysSettings.schoolDays.includes(dayOfWeek)) {
            return {
                allowed: false,
                reason: `Reservas são permitidas apenas em dias letivos (segunda a sexta-feira). A data selecionada é um ${(0, dateUtils_1.getDayOfWeekName)(dayOfWeek)}.`
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
        const aulaValida = sysSettings.lessons.some((l) => l.numero === Number(aula));
        if (!aulaValida) {
            return {
                allowed: false,
                reason: `Aula ${aula} inválida. O sistema possui as aulas de 1 a ${sysSettings.lessons.length}.`
            };
        }
        // 6. Validação do laboratório
        if (!mongoose_1.default.Types.ObjectId.isValid(laboratorioId)) {
            return { allowed: false, reason: 'Identificador do laboratório inválido.' };
        }
        const lab = await Lab_1.Lab.findById(laboratorioId);
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
        const rules = await ReservationRule_1.ReservationRule.find({
            professorId: usuario._id,
            ativo: true
        });
        // Se o professor possui regras específicas cadastradas:
        if (rules.length > 0) {
            const targetDateObj = new Date(data + 'T00:00:00Z');
            const weekOfMonth = (0, dateUtils_1.getWeekOfMonth)(data);
            const matchesAnyRule = rules.some((rule) => {
                // Valida dia da semana
                if (!rule.diasSemana.includes(dayOfWeek))
                    return false;
                // Valida semana específica se configurada
                if (rule.semanas && rule.semanas.length > 0 && !rule.semanas.includes(weekOfMonth)) {
                    return false;
                }
                // Valida período dataInicio / dataFim se configurado
                if (rule.dataInicio && targetDateObj < rule.dataInicio)
                    return false;
                if (rule.dataFim && targetDateObj > rule.dataFim)
                    return false;
                // Valida laboratório se restrito
                if (rule.laboratoriosPermitidos &&
                    rule.laboratoriosPermitidos.length > 0 &&
                    !rule.laboratoriosPermitidos.some((lId) => lId.toString() === lab._id.toString())) {
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
                const dayName = (0, dateUtils_1.getDayOfWeekName)(dayOfWeek);
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
    static async createReservation(input) {
        const settings = await SystemSettings_1.SystemSettings.getSettings();
        // 1. Validação de elegibilidade pelas regras de negócio
        const evaluation = await this.evaluateEligibility(input, settings);
        if (!evaluation.allowed) {
            throw new errorHandler_1.AppError(evaluation.reason || 'Reserva não permitida.', 403, 'RESERVATION_NOT_ALLOWED');
        }
        // 2. Verificação prévia de conflito no banco
        const existing = await Reservation_1.Reservation.findOne({
            laboratorioId: input.laboratorioId,
            data: input.data,
            aula: input.aula,
            status: 'CONFIRMADA'
        });
        if (existing) {
            throw new errorHandler_1.AppError('Não é possível reservar este horário porque o laboratório já está ocupado.', 409, 'RESERVATION_CONFLICT');
        }
        // 3. Persistência da reserva (o índice único composto no MongoDB garante concorrência atômica)
        try {
            const reservation = await Reservation_1.Reservation.create({
                laboratorioId: input.laboratorioId,
                usuarioId: input.usuario._id,
                data: input.data,
                aula: input.aula,
                status: 'CONFIRMADA',
                observacao: input.observacao || '',
                finalidade: input.finalidade || ''
            });
            return reservation;
        }
        catch (err) {
            if (err.code === 11000) {
                throw new errorHandler_1.AppError('Não é possível reservar este horário porque o laboratório já está ocupado.', 409, 'RESERVATION_CONFLICT');
            }
            throw err;
        }
    }
    /**
     * Cancela uma reserva existente. Apenas o professor dono ou administrador podem cancelar.
     */
    static async cancelReservation(reservationId, usuario) {
        const reservation = await Reservation_1.Reservation.findById(reservationId);
        if (!reservation) {
            throw new errorHandler_1.AppError('Reserva não encontrada.', 404, 'RESERVATION_NOT_FOUND');
        }
        if (reservation.status === 'CANCELADA') {
            throw new errorHandler_1.AppError('Esta reserva já se encontra cancelada.', 400, 'RESERVATION_ALREADY_CANCELLED');
        }
        // Permissão: ADMIN pode cancelar qualquer reserva; PROFESSOR só pode cancelar a sua
        const isOwner = reservation.usuarioId.toString() === usuario._id.toString();
        const isAdmin = usuario.role === 'ADMIN';
        if (!isOwner && !isAdmin) {
            throw new errorHandler_1.AppError('Você não tem permissão para cancelar esta reserva.', 403, 'AUTH_FORBIDDEN');
        }
        reservation.status = 'CANCELADA';
        await reservation.save();
        return reservation;
    }
}
exports.ReservationService = ReservationService;
