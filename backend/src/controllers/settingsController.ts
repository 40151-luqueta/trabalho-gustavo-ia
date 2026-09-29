import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SystemSettings } from '../models/SystemSettings';
import { sendSuccess, sendError } from '../utils/response';

export async function getSettings(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await SystemSettings.getSettings();
    sendSuccess(res, { configuracoes: settings.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reservationWindowWeeks, exceptionAdvanceDays, lessons, schoolDays, timezone } = req.body;

    const settings = await SystemSettings.getSettings();

    if (reservationWindowWeeks !== undefined) {
      const weeks = Number(reservationWindowWeeks);
      if (weeks < 1 || weeks > 52) {
        sendError(res, 'VALIDATION_ERROR', 'A janela de semanas deve estar entre 1 e 52', 400);
        return;
      }
      settings.reservationWindowWeeks = weeks;
    }

    if (exceptionAdvanceDays !== undefined) {
      const days = Number(exceptionAdvanceDays);
      if (days < 0 || days > 30) {
        sendError(res, 'VALIDATION_ERROR', 'A antecedência excepcional deve estar entre 0 e 30 dias', 400);
        return;
      }
      settings.exceptionAdvanceDays = days;
    }

    if (lessons && Array.isArray(lessons)) {
      settings.lessons = lessons;
    }

    if (schoolDays && Array.isArray(schoolDays)) {
      settings.schoolDays = schoolDays;
    }

    if (timezone) {
      settings.timezone = timezone;
    }

    await settings.save();
    sendSuccess(res, { configuracoes: settings.toJSON() }, 200, 'Configurações atualizadas com sucesso');
  } catch (error) {
    next(error);
  }
}
