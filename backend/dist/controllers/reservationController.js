"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listReservations = listReservations;
exports.checkReservation = checkReservation;
exports.createReservation = createReservation;
exports.cancelReservation = cancelReservation;
const Reservation_1 = require("../models/Reservation");
const reservationService_1 = require("../services/reservationService");
const SystemSettings_1 = require("../models/SystemSettings");
const Lab_1 = require("../models/Lab");
const response_1 = require("../utils/response");
async function listReservations(req, res, next) {
    try {
        const { dataInicio, dataFim, data, laboratorioId, professorId, status } = req.query;
        const filter = {};
        if (req.user?.role === 'PROFESSOR') {
            // Professor pode filtrar as suas próprias reservas por padrão, a não ser que consulte data pública
            if (req.query.minhas === 'true') {
                filter.usuarioId = req.user._id;
            }
        }
        else if (professorId) {
            filter.usuarioId = professorId;
        }
        if (data) {
            filter.data = data;
        }
        else if (dataInicio || dataFim) {
            filter.data = {};
            if (dataInicio)
                filter.data.$gte = dataInicio;
            if (dataFim)
                filter.data.$lte = dataFim;
        }
        if (laboratorioId) {
            filter.laboratorioId = laboratorioId;
        }
        if (status) {
            filter.status = status;
        }
        const reservations = await Reservation_1.Reservation.find(filter)
            .populate('laboratorioId', 'codigo nome capacidade localizacao')
            .populate('usuarioId', 'nome email role')
            .sort({ data: 1, aula: 1 });
        (0, response_1.sendSuccess)(res, { reservas: reservations.map((r) => r.toJSON()) });
    }
    catch (error) {
        next(error);
    }
}
async function checkReservation(req, res, next) {
    try {
        const { laboratorioId, data, aula } = req.body;
        if (!req.user) {
            (0, response_1.sendError)(res, 'AUTH_REQUIRED', 'Usuário não autenticado', 401);
            return;
        }
        if (!laboratorioId || !data || !aula) {
            (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'Laboratório, data e aula são obrigatórios', 400);
            return;
        }
        const settings = await SystemSettings_1.SystemSettings.getSettings();
        const evaluation = await reservationService_1.ReservationService.evaluateEligibility({
            laboratorioId,
            data,
            aula: Number(aula),
            usuario: req.user
        }, settings);
        // Verificar se o laboratório já está ocupado
        const existing = await Reservation_1.Reservation.findOne({
            laboratorioId,
            data,
            aula: Number(aula),
            status: 'CONFIRMADA'
        }).populate('usuarioId', 'nome');
        const lab = await Lab_1.Lab.findById(laboratorioId);
        const lessonInfo = settings.lessons.find((l) => l.numero === Number(aula));
        if (existing) {
            (0, response_1.sendSuccess)(res, {
                disponivel: false,
                elegivel: false,
                motivo: 'Não é possível reservar este horário porque o laboratório já está ocupado.',
                detalhes: {
                    laboratorio: lab?.nome,
                    data,
                    aula: Number(aula),
                    horario: lessonInfo ? `${lessonInfo.horarioInicio} - ${lessonInfo.horarioFim}` : '',
                    ocupadoPor: existing.usuarioId ? existing.usuarioId.nome : 'Reservado'
                }
            });
            return;
        }
        if (!evaluation.allowed) {
            (0, response_1.sendSuccess)(res, {
                disponivel: true, // o laboratório está livre, mas o usuário não tem permissão
                elegivel: false,
                motivo: evaluation.reason,
                detalhes: {
                    laboratorio: lab?.nome,
                    data,
                    aula: Number(aula),
                    horario: lessonInfo ? `${lessonInfo.horarioInicio} - ${lessonInfo.horarioFim}` : ''
                }
            });
            return;
        }
        (0, response_1.sendSuccess)(res, {
            disponivel: true,
            elegivel: true,
            isExcecao: !!evaluation.isException,
            motivo: evaluation.reason || 'Horário disponível e elegível para agendamento.',
            detalhes: {
                professor: req.user.nome,
                laboratorio: lab?.nome,
                data,
                aula: Number(aula),
                horario: lessonInfo ? `${lessonInfo.horarioInicio} - ${lessonInfo.horarioFim}` : '',
                status: 'Disponível'
            }
        });
    }
    catch (error) {
        next(error);
    }
}
async function createReservation(req, res, next) {
    try {
        const { laboratorioId, data, aula, observacao, finalidade } = req.body;
        if (!req.user) {
            (0, response_1.sendError)(res, 'AUTH_REQUIRED', 'Usuário não autenticado', 401);
            return;
        }
        if (!laboratorioId || !data || !aula) {
            (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'Laboratório, data e aula são obrigatórios', 400);
            return;
        }
        const reservation = await reservationService_1.ReservationService.createReservation({
            laboratorioId,
            data,
            aula: Number(aula),
            observacao,
            finalidade,
            usuario: req.user
        });
        const populated = await Reservation_1.Reservation.findById(reservation._id)
            .populate('laboratorioId', 'codigo nome')
            .populate('usuarioId', 'nome email');
        (0, response_1.sendSuccess)(res, { reserva: populated?.toJSON() }, 201, 'Reserva realizada com sucesso!');
    }
    catch (error) {
        next(error);
    }
}
async function cancelReservation(req, res, next) {
    try {
        const { id } = req.params;
        if (!req.user) {
            (0, response_1.sendError)(res, 'AUTH_REQUIRED', 'Usuário não autenticado', 401);
            return;
        }
        const reservation = await reservationService_1.ReservationService.cancelReservation(id, req.user);
        (0, response_1.sendSuccess)(res, { reserva: reservation.toJSON() }, 200, 'Reserva cancelada com sucesso!');
    }
    catch (error) {
        next(error);
    }
}
