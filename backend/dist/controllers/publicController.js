"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicSchedule = getPublicSchedule;
exports.getPublicInfo = getPublicInfo;
const Lab_1 = require("../models/Lab");
const Reservation_1 = require("../models/Reservation");
const SystemSettings_1 = require("../models/SystemSettings");
const response_1 = require("../utils/response");
const dateUtils_1 = require("../utils/dateUtils");
async function getPublicSchedule(req, res, next) {
    try {
        const settings = await SystemSettings_1.SystemSettings.getSettings();
        let dataStr = req.query.data;
        if (!dataStr) {
            dataStr = (0, dateUtils_1.getTodayDateString)(settings.timezone);
        }
        if (!(0, dateUtils_1.isValidDateFormat)(dataStr)) {
            (0, response_1.sendError)(res, 'INVALID_DATE', 'Data informada é inválida. Utilize o formato YYYY-MM-DD.', 400);
            return;
        }
        const todayStr = (0, dateUtils_1.getTodayDateString)(settings.timezone);
        const diffDays = (0, dateUtils_1.calculateDaysDifference)(dataStr, todayStr, settings.timezone);
        const maxWindowDays = settings.reservationWindowWeeks * 7;
        // Verificar se a data consultada está dentro da janela configurada
        if (diffDays > maxWindowDays) {
            (0, response_1.sendError)(res, 'DATE_OUTSIDE_WINDOW', `A data informada ultrapassa a janela pública de visualização de ${settings.reservationWindowWeeks} semanas.`, 400);
            return;
        }
        // Buscar laboratórios ativos (apenas campos públicos seguros)
        const labs = await Lab_1.Lab.find({ ativo: true })
            .select('codigo nome capacidade localizacao')
            .sort({ nome: 1 });
        // Buscar reservas confirmadas para a data específica
        const reservations = await Reservation_1.Reservation.find({
            data: dataStr,
            status: 'CONFIRMADA'
        }).populate('usuarioId', 'nome');
        // Mapeamento rápido de reservas: key = `${labId}_${aula}`
        const reservationMap = new Map();
        for (const r of reservations) {
            const teacherName = r.usuarioId?.nome || 'Professor';
            reservationMap.set(`${r.laboratorioId.toString()}_${r.aula}`, teacherName);
        }
        // Montar grade pública segura
        const dayOfWeek = (0, dateUtils_1.getDayOfWeek)(dataStr);
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
        (0, response_1.sendSuccess)(res, {
            data: dataStr,
            diaSemanaNumero: dayOfWeek,
            diaSemanaNome: (0, dateUtils_1.getDayOfWeekName)(dayOfWeek),
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
    }
    catch (error) {
        next(error);
    }
}
async function getPublicInfo(_req, res, next) {
    try {
        const settings = await SystemSettings_1.SystemSettings.getSettings();
        const labs = await Lab_1.Lab.find({ ativo: true })
            .select('codigo nome capacidade localizacao')
            .sort({ nome: 1 });
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        next(error);
    }
}
