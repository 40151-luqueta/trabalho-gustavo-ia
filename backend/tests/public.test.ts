import request from 'supertest';
import { createApp } from '../src/app';
import { setupTestDB, teardownTestDB } from './setup';
import { Lab } from '../src/models/Lab';
import { User } from '../src/models/User';
import { Reservation } from '../src/models/Reservation';
import { getTodayDateString } from '../src/utils/dateUtils';

const app = createApp();

beforeAll(async () => {
  await setupTestDB();

  // Criar uma reserva para aparecer na grade pública
  const lab1 = await Lab.findOne({ codigo: 'lab1' });
  const teacher = await User.create({
    nome: 'Prof. Exemplo Publico',
    email: 'exemplo@escola.com',
    senha: 'senha123456',
    role: 'PROFESSOR',
    status: 'ATIVO'
  });

  const todayStr = getTodayDateString();

  await Reservation.create({
    laboratorioId: lab1!._id,
    usuarioId: teacher._id,
    data: todayStr,
    aula: 1,
    status: 'CONFIRMADA'
  });
});

afterAll(async () => {
  await teardownTestDB();
});

describe('4. Suíte de Testes da Programação Pública e Segurança', () => {
  it('deve permitir acesso público à grade sem qualquer cabeçalho de autenticação', async () => {
    const todayStr = getTodayDateString();
    const res = await request(app).get(`/api/public/schedule?data=${todayStr}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.grade).toBeDefined();
    expect(res.body.data.laboratorios.length).toBeGreaterThanOrEqual(5);
  });

  it('deve exibir o laboratório reservado como RESERVADO e com o nome do professor', async () => {
    const todayStr = getTodayDateString();
    const res = await request(app).get(`/api/public/schedule?data=${todayStr}`);

    const aula1 = res.body.data.grade.find((g: any) => g.aula === 1);
    expect(aula1).toBeDefined();

    const slotLab1 = aula1.slots.find((s: any) => s.laboratorioCodigo === 'lab1');
    expect(slotLab1).toBeDefined();
    expect(slotLab1.status).toBe('RESERVADO');
    expect(slotLab1.responsavel).toBe('Prof. Exemplo Publico');

    // Outros laboratórios nesta mesma aula devem estar LIVRE
    const slotLab2 = aula1.slots.find((s: any) => s.laboratorioCodigo === 'lab2');
    expect(slotLab2.status).toBe('LIVRE');
    expect(slotLab2.responsavel).toBeNull();
  });

  it('NÃO DEVE expor dados confidenciais (senha, hash, email, token) na rota pública', async () => {
    const todayStr = getTodayDateString();
    const res = await request(app).get(`/api/public/schedule?data=${todayStr}`);
    const rawString = JSON.stringify(res.body);

    expect(rawString).not.toContain('senha');
    expect(rawString).not.toContain('bcrypt');
    expect(rawString).not.toContain('exemplo@escola.com'); // email pessoal protegido
    expect(rawString).not.toContain('jwt');
    expect(rawString).not.toContain('token');
  });

  it('deve fornecer informações públicas gerais da escola no endpoint /api/public/info', async () => {
    const res = await request(app).get('/api/public/info');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.aulas.length).toBe(6);
    expect(res.body.data.laboratorios.length).toBe(5);
    expect(res.body.data.janelaSemanas).toBeDefined();
  });
});
