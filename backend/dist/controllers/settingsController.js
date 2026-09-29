"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
const SystemSettings_1 = require("../models/SystemSettings");
const response_1 = require("../utils/response");
async function getSettings(_req, res, next) {
    try {
        const settings = await SystemSettings_1.SystemSettings.getSettings();
        (0, response_1.sendSuccess)(res, { configuracoes: settings.toJSON() });
    }
    catch (error) {
        next(error);
    }
}
async function updateSettings(req, res, next) {
    try {
        const { reservationWindowWeeks, exceptionAdvanceDays, lessons, schoolDays, timezone } = req.body;
        const settings = await SystemSettings_1.SystemSettings.getSettings();
        if (reservationWindowWeeks !== undefined) {
            const weeks = Number(reservationWindowWeeks);
            if (weeks < 1 || weeks > 52) {
                (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'A janela de semanas deve estar entre 1 e 52', 400);
                return;
            }
            settings.reservationWindowWeeks = weeks;
        }
        if (exceptionAdvanceDays !== undefined) {
            const days = Number(exceptionAdvanceDays);
            if (days < 0 || days > 30) {
                (0, response_1.sendError)(res, 'VALIDATION_ERROR', 'A antecedência excepcional deve estar entre 0 e 30 dias', 400);
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
        (0, response_1.sendSuccess)(res, { configuracoes: settings.toJSON() }, 200, 'Configurações atualizadas com sucesso');
    }
    catch (error) {
        next(error);
    }
}
