import request from 'supertest';
import { createApp } from '../src/app';
import { setupTestDB, teardownTestDB } from './setup';
import { User } from '../src/models/User';
import { Lab } from '../src/models/Lab';
import { SystemSettings } from '../src/models/SystemSettings';
import { runSeed } from '../src/seed/seed';
import { getTodayDateString, getCurrentTimeString, parseDateOnly } from '../src/utils/dateUtils';
import * as dateUtils from '../src/utils/dateUtils';

const app = createApp();

let teacherToken: string;
let lab1Id: string;

function getOffsetDate(daysToAdd: number): string {
  const today = parseDateOnly(getTodayDateString());
  const target = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, '0');
  const d = String(target.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNextWeekdayDate(minDaysAhead: number): string {
  for (let i = minDaysAhead; i < minDaysAhead + 14; i++) {
    const dateStr = getOffsetDate(i);
    const date = parseDateOnly(dateStr);
    const day = date.getUTCDay();
    const normalizedDay = day === 0 ? 7 : day;
    if (normalizedDay >= 1 && normalizedDay <= 5) {
      return dateStr;
    }
  }
  return getOffsetDate(minDaysAhead);
}

beforeAll(async () => {
  await setupTestDB();

  const labs = await Lab.find({});
  lab1Id = labs.find((l) => l.codigo === 'lab1')!._id.toString();

  // Criar professor para testes de reserva
  const teacher = await User.create({
    nome: 'Prof. Validador',
    email: 'validador@escola.com',
    senha: 'senha123456',
    role: 'PROFESSOR',
    status: 'ATIVO'
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'validador@escola.com', senha: 'senha123456' });
  teacherToken = res.body.data.token;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('5. Suíte de Validação de Deploy, Admin Oficial e Bloqueio de Horários Passados', () => {
  it('deve sincronizar e criar no deploy a conta de admin oficial 40151@raphaeldisanto.com.br', async () => {
    // Simula a execução do deploy / seed com a conta padrão
    const { config } = await import('../src/config/env');
    config.adminInitial.email = '40151@raphaeldisanto.com.br';
    config.adminInitial.senha = '40151@raphaeldisanto.com.br';

    await runSeed({ silent: true });

    const admin = await User.findOne({ email: '40151@raphaeldisanto.com.br' });
    expect(admin).toBeDefined();
    expect(admin!.role).toBe('ADMIN');
    expect(admin!.status).toBe('ATIVO');

    // Testar login com a conta de admin do deploy
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: '40151@raphaeldisanto.com.br',
        senha: '40151@raphaeldisanto.com.br'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.token).toBeDefined();
    expect(loginRes.body.data.usuario.email).toBe('40151@raphaeldisanto.com.br');
    expect(loginRes.body.data.usuario.role).toBe('ADMIN');
  });

  it('deve possuir a nova grade horária: 3 aulas antes das 9:45, intervalo de 20 min até 10:05 e 3 aulas depois', async () => {
    const settings = await SystemSettings.getSettings();
    expect(settings.lessons.length).toBe(6);

    const lessons = settings.lessons;
    // 3 antes do intervalo (terminando às 09:45)
    expect(lessons[0]).toMatchObject({ numero: 1, nome: 'Aula 1', horarioInicio: '07:15', horarioFim: '08:05' });
    expect(lessons[1]).toMatchObject({ numero: 2, nome: 'Aula 2', horarioInicio: '08:05', horarioFim: '08:55' });
    expect(lessons[2]).toMatchObject({ numero: 3, nome: 'Aula 3', horarioInicio: '08:55', horarioFim: '09:45' });

    // Intervalo de 20 min entre 09:45 e 10:05
    // 3 depois do intervalo (começando às 10:05)
    expect(lessons[3]).toMatchObject({ numero: 4, nome: 'Aula 4', horarioInicio: '10:05', horarioFim: '10:55' });
    expect(lessons[4]).toMatchObject({ numero: 5, nome: 'Aula 5', horarioInicio: '10:55', horarioFim: '11:45' });
    expect(lessons[5]).toMatchObject({ numero: 6, nome: 'Aula 6', horarioInicio: '11:45', horarioFim: '12:35' });
  });

  it('deve BLOQUEAR reserva para hoje quando o horário da aula já passou (ex: às 12:00 cadastrar aula das 9 horas)', async () => {
    const todayStr = getTodayDateString();

    // Espionar getCurrentTimeString para simular 12:00
    const timeSpy = jest.spyOn(dateUtils, 'getCurrentTimeString').mockReturnValue('12:00');

    // Tentar cadastrar Aula 3 (08:55 - 09:45, horário das 9 horas) para hoje às 12:00
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab1Id,
        data: todayStr,
        aula: 3 // Aula 3 iniciou às 08:55
      });

    timeSpy.mockRestore();

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESERVATION_NOT_ALLOWED');
    expect(res.body.error.message).toContain('já passaram');
    expect(res.body.error.message).toContain('Aula 3');
  });

  it('/api/reservations/check deve retornar elegivel: false quando o horário da aula já passou no dia de hoje', async () => {
    const todayStr = getTodayDateString();

    // Simular que o horário atual é 12:00
    const timeSpy = jest.spyOn(dateUtils, 'getCurrentTimeString').mockReturnValue('12:00');

    const res = await request(app)
      .post('/api/reservations/check')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab1Id,
        data: todayStr,
        aula: 1 // Aula 1 iniciou às 07:15
      });

    timeSpy.mockRestore();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.elegivel).toBe(false);
    expect(res.body.data.motivo).toContain('já passaram');
  });

  it('deve PERMITIR agendar aula hoje caso o horário de início ainda não tenha passado', async () => {
    const todayStr = getTodayDateString();

    // Simular que o horário atual é 07:00 (antes da Aula 1 que começa às 07:15)
    const timeSpy = jest.spyOn(dateUtils, 'getCurrentTimeString').mockReturnValue('07:00');

    const res = await request(app)
      .post('/api/reservations/check')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab1Id,
        data: todayStr,
        aula: 1
      });

    timeSpy.mockRestore();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.elegivel).toBe(true);
  });

  it('deve PERMITIR agendar aula para data futura (ex: próximo dia útil) independentemente do horário atual', async () => {
    const futureDate = getNextWeekdayDate(1);

    // Simular horário tardio (23:00)
    const timeSpy = jest.spyOn(dateUtils, 'getCurrentTimeString').mockReturnValue('23:00');

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab1Id,
        data: futureDate,
        aula: 1
      });

    timeSpy.mockRestore();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reserva.status).toBe('CONFIRMADA');
  });
});
