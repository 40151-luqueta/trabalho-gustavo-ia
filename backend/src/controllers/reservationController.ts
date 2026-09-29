import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Reservation } from '../models/Reservation';
import { ReservationService } from '../services/reservationService';
import { SystemSettings } from '../models/SystemSettings';
import { Lab } from '../models/Lab';
import { sendSuccess, sendError } from '../utils/response';

export async function listReservations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { dataInicio, dataFim, data, laboratorioId, professorId, status } = req.query;
    const filter: any = {};

    if (req.user?.role === 'PROFESSOR') {
      // Professor pode filtrar as suas próprias reservas por padrão, a não ser que consulte data pública
      if (req.query.minhas === 'true') {
        filter.usuarioId = req.user._id;
      }
    } else if (professorId) {
      filter.usuarioId = professorId;
    }

    if (data) {
      filter.data = data;
    } else if (dataInicio || dataFim) {
      filter.data = {};
      if (dataInicio) filter.data.$gte = dataInicio;
      if (dataFim) filter.data.$lte = dataFim;
    }

    if (laboratorioId) {
      filter.laboratorioId = laboratorioId;
    }

    if (status) {
      filter.status = status;
    }

    const reservations = await Reservation.find(filter)
      .populate('laboratorioId', 'codigo nome capacidade localizacao')
      .populate('usuarioId', 'nome email role')
      .sort({ data: 1, aula: 1 });

    sendSuccess(res, { reservas: reservations.map((r) => r.toJSON()) });
  } catch (error) {
    next(error);
  }
}

export async function checkReservation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { laboratorioId, data, aula } = req.body;

    if (!req.user) {
      sendError(res, 'AUTH_REQUIRED', 'Usuário não autenticado', 401);
      return;
    }

    if (!laboratorioId || !data || !aula) {
      sendError(res, 'VALIDATION_ERROR', 'Laboratório, data e aula são obrigatórios', 400);
      return;
    }

    const settings = await SystemSettings.getSettings();
    const evaluation = await ReservationService.evaluateEligibility(
      {
        laboratorioId,
        data,
        aula: Number(aula),
        usuario: req.user
      },
      settings
    );

    // Verificar se o laboratório já está ocupado
    const existing = await Reservation.findOne({
      laboratorioId,
      data,
      aula: Number(aula),
      status: 'CONFIRMADA'
    }).populate('usuarioId', 'nome');

    const lab = await Lab.findById(laboratorioId);
    const lessonInfo = settings.lessons.find((l) => l.numero === Number(aula));

    if (existing) {
      sendSuccess(res, {
        disponivel: false,
        elegivel: false,
        motivo: 'Não é possível reservar este horário porque o laboratório já está ocupado.',
        detalhes: {
          laboratorio: lab?.nome,
          data,
          aula: Number(aula),
          horario: lessonInfo ? `${lessonInfo.horarioInicio} - ${lessonInfo.horarioFim}` : '',
          ocupadoPor: existing.usuarioId ? (existing.usuarioId as any).nome : 'Reservado'
        }
      });
      return;
    }

    if (!evaluation.allowed) {
      sendSuccess(res, {
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

    sendSuccess(res, {
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
  } catch (error) {
    next(error);
  }
}

export async function createReservation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { laboratorioId, data, aula, observacao, finalidade } = req.body;

    if (!req.user) {
      sendError(res, 'AUTH_REQUIRED', 'Usuário não autenticado', 401);
      return;
    }

    if (!laboratorioId || !data || !aula) {
      sendError(res, 'VALIDATION_ERROR', 'Laboratório, data e aula são obrigatórios', 400);
      return;
    }

    const reservation = await ReservationService.createReservation({
      laboratorioId,
      data,
      aula: Number(aula),
      observacao,
      finalidade,
      usuario: req.user
    });

    const populated = await Reservation.findById(reservation._id)
      .populate('laboratorioId', 'codigo nome')
      .populate('usuarioId', 'nome email');

    sendSuccess(
      res,
      { reserva: populated?.toJSON() },
      201,
      'Reserva realizada com sucesso!'
    );
  } catch (error) {
    next(error);
  }
}

export async function cancelReservation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user) {
      sendError(res, 'AUTH_REQUIRED', 'Usuário não autenticado', 401);
      return;
    }

    const reservation = await ReservationService.cancelReservation(id, req.user);
    sendSuccess(res, { reserva: reservation.toJSON() }, 200, 'Reserva cancelada com sucesso!');
  } catch (error) {
    next(error);
  }
}
