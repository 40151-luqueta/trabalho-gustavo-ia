import request from 'supertest';
import { createApp } from '../src/app';
import { setupTestDB, teardownTestDB } from './setup';
import { User } from '../src/models/User';

const app = createApp();

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('1. Suíte de Testes de Autenticação e Usuários', () => {
  it('deve registrar um novo aluno com status ATIVO por padrão', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nome: 'Aluno Teste',
        email: 'aluno@teste.com',
        senha: 'senha123456',
        role: 'ALUNO'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.usuario.role).toBe('ALUNO');
    expect(res.body.data.usuario.status).toBe('ATIVO');
    expect(res.body.data.usuario.senha).toBeUndefined();
  });

  it('deve registrar um novo professor com status PENDENTE de aprovação', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nome: 'Professor Carlos',
        email: 'carlos@teste.com',
        senha: 'senha123456',
        role: 'PROFESSOR'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.usuario.role).toBe('PROFESSOR');
    expect(res.body.data.usuario.status).toBe('PENDENTE');
  });

  it('não deve permitir login de professor em estado PENDENTE', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'carlos@teste.com',
        senha: 'senha123456'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('USER_NOT_APPROVED');
  });

  it('deve permitir login do administrador inicial e retornar token JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@escola.com',
        senha: 'AdminSeguro@2027'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.usuario.role).toBe('ADMIN');
  });

  it('deve rejeitar login com senha incorreta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@escola.com',
        senha: 'senha_errada_total'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('deve impedir login de usuário com status BLOQUEADO', async () => {
    await User.create({
      nome: 'Usuário Bloqueado',
      email: 'bloqueado@teste.com',
      senha: 'senha123456',
      role: 'ALUNO',
      status: 'BLOQUEADO'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bloqueado@teste.com',
        senha: 'senha123456'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('USER_BLOCKED');
  });
});
