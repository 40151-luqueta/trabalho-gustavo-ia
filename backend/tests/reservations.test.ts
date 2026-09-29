import request from 'supertest';
import { createApp } from '../src/app';
import { setupTestDB, teardownTestDB } from './setup';
import { User } from '../src/models/User';
import { Lab } from '../src/models/Lab';
import { ReservationRule } from '../src/models/ReservationRule';
import { SystemSettings } from '../src/models/SystemSettings';
import { getTodayDateString, parseDateOnly } from '../src/utils/dateUtils';

const app = createApp();

let adminToken: string;
let teacherToken: string;
let teacherId: string;
let studentToken: string;
let lab1Id: string;
let lab2Id: string;

function getOffsetDate(daysToAdd: number): string {
  const today = parseDateOnly(getTodayDateString());
  const target = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, '0');
  const d = String(target.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Encontra o próximo dia útil a partir de um número mínimo de dias à frente
function getNextWeekdayDate(minDaysAhead: number, targetDayOfWeek?: number): string {
  for (let i = minDaysAhead; i < minDaysAhead + 14; i++) {
    const dateStr = getOffsetDate(i);
    const date = parseDateOnly(dateStr);
    const day = date.getUTCDay(); // 0 Dom, 6 Sab
    const normalizedDay = day === 0 ? 7 : day;
    if (targetDayOfWeek) {
      if (normalizedDay === targetDayOfWeek) return dateStr;
    } else if (normalizedDay >= 1 && normalizedDay <= 5) {
      return dateStr;
    }
  }
  return getOffsetDate(minDaysAhead);
}

beforeAll(async () => {
  await setupTestDB();

  // Obter laboratórios criados no seed
  const labs = await Lab.find({});
  lab1Id = labs.find((l) => l.codigo === 'lab1')!._id.toString();
  lab2Id = labs.find((l) => l.codigo === 'lab2')!._id.toString();

  // Admin login
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@escola.com', senha: 'AdminSeguro@2027' });
  adminToken = adminRes.body.data.token;

  // Criar e aprovar professor
  const teacher = await User.create({
    nome: 'Prof. Roberto',
    email: 'roberto@escola.com',
    senha: 'senha123456',
    role: 'PROFESSOR',
    status: 'ATIVO'
  });
  teacherId = teacher._id.toString();

  const teacherRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'roberto@escola.com', senha: 'senha123456' });
  teacherToken = teacherRes.body.data.token;

  // Criar aluno
  await User.create({
    nome: 'Aluno Lucas',
    email: 'lucas@aluno.com',
    senha: 'senha123456',
    role: 'ALUNO',
    status: 'ATIVO'
  });

  const studentRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'lucas@aluno.com', senha: 'senha123456' });
  studentToken = studentRes.body.data.token;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('3. Suíte de Testes do Motor de Reservas e Conflitos', () => {
  it('aluno deve ser PROIBIDO de criar reservas (403)', async () => {
    const dateStr = getNextWeekdayDate(1);
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        laboratorioId: lab1Id,
        data: dateStr,
        aula: 1
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('STUDENT_CANNOT_RESERVE');
  });

  it('professor aprovado deve conseguir criar uma reserva válida', async () => {
    const dateStr = getNextWeekdayDate(1);
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab1Id,
        data: dateStr,
        aula: 2,
        observacao: 'Aula de algoritmos'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reserva.status).toBe('CONFIRMADA');
  });

  it('deve BLOQUEAR reserva duplicada para mesmo laboratório + data + aula (409 Conflict)', async () => {
    const dateStr = getNextWeekdayDate(1);
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        laboratorioId: lab1Id,
        data: dateStr,
        aula: 2
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESERVATION_CONFLICT');
  });

  it('deve PERMITIR reserva simultânea em laboratório DIFERENTE no mesmo horário', async () => {
    const dateStr = getNextWeekdayDate(1);
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab2Id, // Laboratório 2
        data: dateStr,
        aula: 2 // Mesma aula da reserva anterior
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('deve rejeitar reserva para datas fora da janela máxima de semanas (403)', async () => {
    // Janela padrão é 4 semanas (28 dias). Testar com 35 dias à frente:
    const farDate = getNextWeekdayDate(35);
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab1Id,
        data: farDate,
        aula: 3
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESERVATION_NOT_ALLOWED');
    expect(res.body.error.message).toContain('janela');
  });

  it('deve respeitar regras restritivas do professor quando fora da antecedência excepcional', async () => {
    // Criar uma regra onde o professor Roberto só pode reservar nas Segundas-feiras (dia 1)
    await ReservationRule.create({
      professorId: teacherId,
      nome: 'Apenas Segundas',
      tipo: 'RECORRENTE',
      diasSemana: [1], // Somente Segunda-feira
      ativo: true
    });

    // Encontrar uma Quarta-feira (dia 3) que esteja há mais de 3 dias de hoje (fora da antecedência excepcional de 1 dia)
    const nextWed = getNextWeekdayDate(5, 3);

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab1Id,
        data: nextWed,
        aula: 4
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESERVATION_NOT_ALLOWED');
    expect(res.body.error.message).toContain('antecedência excepcional');
  });

  it('deve permitir agendamento por EXCEÇÃO DE ANTECEDÊNCIA mesmo fora dos dias regulares da regra', async () => {
    // Professor possui regra para segunda, mas vamos testar reserva com antecedência de 1 dia (amanhã ou hoje)
    // Se o próximo dia letivo for amanhã (1 dia de antecedência):
    const tomorrowWeekday = getNextWeekdayDate(1);

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab1Id,
        data: tomorrowWeekday,
        aula: 5
      });

    // Deve ser permitido pela regra de exceção de 1 dia de antecedência
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('deve permitir que o administrador altere a antecedência excepcional para 2 dias e reflita dinamicamente', async () => {
    // Admin altera antecedência de 1 para 3 dias
    const patchRes = await request(app)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        exceptionAdvanceDays: 3
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.configuracoes.exceptionAdvanceDays).toBe(3);

    // Agora uma data a 2 ou 3 dias letivos de antecedência deve ser permitida pela nova regra
    const dateIn3Days = getNextWeekdayDate(2);
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab2Id,
        data: dateIn3Days,
        aula: 6
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('professor pode cancelar sua própria reserva e liberar o horário para outros', async () => {
    const dateStr = getNextWeekdayDate(1);
    // Cria reserva no lab 3 aula 1
    const labs = await Lab.find({});
    const lab3Id = labs.find((l) => l.codigo === 'lab3')!._id.toString();

    const createRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        laboratorioId: lab3Id,
        data: dateStr,
        aula: 1
      });

    const reservaId = createRes.body.data.reserva.id;

    // Cancela
    const cancelRes = await request(app)
      .delete(`/api/reservations/${reservaId}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.reserva.status).toBe('CANCELADA');

    // Agora outro usuário (ex: admin) deve conseguir reservar o mesmo horário liberado
    const rebookRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        laboratorioId: lab3Id,
        data: dateStr,
        aula: 1
      });

    expect(rebookRes.status).toBe(201);
    expect(rebookRes.body.success).toBe(true);
  });
});
