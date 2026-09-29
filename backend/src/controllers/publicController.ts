import { Request, Response, NextFunction } from 'express';
import { Lab } from '../models/Lab';
import { Reservation } from '../models/Reservation';
import { SystemSettings } from '../models/SystemSettings';
import { sendSuccess, sendError } from '../utils/response';
import {
  getTodayDateString,
  isValidDateFormat,
  getDayOfWeek,
  getDayOfWeekName,
  calculateDaysDifference
} from '../utils/dateUtils';

export async function getPublicSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await SystemSettings.getSettings();
    let dataStr = req.query.data as string;

    if (!dataStr) {
      dataStr = getTodayDateString(settings.timezone);
    }

    if (!isValidDateFormat(dataStr)) {
      sendError(res, 'INVALID_DATE', 'Data informada é inválida. Utilize o formato YYYY-MM-DD.', 400);
      return;
    }

    const todayStr = getTodayDateString(settings.timezone);
    const diffDays = calculateDaysDifference(dataStr, todayStr, settings.timezone);
    const maxWindowDays = settings.reservationWindowWeeks * 7;

    // Verificar se a data consultada está dentro da janela configurada
    if (diffDays > maxWindowDays) {
      sendError(
        res,
        'DATE_OUTSIDE_WINDOW',
        `A data informada ultrapassa a janela pública de visualização de ${settings.reservationWindowWeeks} semanas.`,
        400
      );
      return;
    }

    // Buscar laboratórios ativos (apenas campos públicos seguros)
    const labs = await Lab.find({ ativo: true })
      .select('codigo nome capacidade localizacao')
      .sort({ nome: 1 });

    // Buscar reservas confirmadas para a data específica
    const reservations = await Reservation.find({
      data: dataStr,
      status: 'CONFIRMADA'
    }).populate('usuarioId', 'nome');

    // Mapeamento rápido de reservas: key = `${labId}_${aula}`
    const reservationMap = new Map<string, string>();
    for (const r of reservations) {
      const teacherName = (r.usuarioId as any)?.nome || 'Professor';
      reservationMap.set(`${r.laboratorioId.toString()}_${r.aula}`, teacherName);
    }

    // Montar grade pública segura
    const dayOfWeek = getDayOfWeek(dataStr);
    const isSchoolDay = settings.schoolDays.includes(dayOfWeek);

    const grade = settings.lessons.map((lesson) => {
      const slots = labs.map((lab) => {
        const key = `${lab._id.toString()}_${lesson.numero}`;
        const isReserved = reservationMap.has(key);

        return {
          laboratorioId: lab._id.toString(),
          laboratorioNome: lab.nome,
          laboratorioCodigo: lab.codigo,
          status: isReserved ? 'RESERVADO' : 'LIVRE',
          responsavel: isReserved ? reservationMap.get(key) : null
        };
      });

      return {
        aula: lesson.numero,
        nomeAula: lesson.nome,
        horario: `${lesson.horarioInicio} - ${lesson.horarioFim}`,
        slots
      };
    });

    sendSuccess(res, {
      data: dataStr,
      diaSemanaNumero: dayOfWeek,
      diaSemanaNome: getDayOfWeekName(dayOfWeek),
      isDiaLetivo: isSchoolDay,
      janelaSemanas: settings.reservationWindowWeeks,
      laboratorios: labs.map((l) => ({
        id: l._id.toString(),
        codigo: l.codigo,
        nome: l.nome,
        capacidade: l.capacidade,
        localizacao: l.localizacao
      })),
      grade
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicInfo(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await SystemSettings.getSettings();
    const labs = await Lab.find({ ativo: true })
      .select('codigo nome capacidade localizacao')
      .sort({ nome: 1 });

    sendSuccess(res, {
      laboratorios: labs.map((l) => ({
        id: l._id.toString(),
        codigo: l.codigo,
        nome: l.nome,
        capacidade: l.capacidade,
        localizacao: l.localizacao
      })),
      aulas: settings.lessons,
      diasLetivos: settings.schoolDays,
      janelaSemanas: settings.reservationWindowWeeks,
      antecedenciaExcepcionalDias: settings.exceptionAdvanceDays
    });
  } catch (error) {
    next(error);
  }
}
