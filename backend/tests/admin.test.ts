import request from 'supertest';
import { createApp } from '../src/app';
import { setupTestDB, teardownTestDB } from './setup';
import { User } from '../src/models/User';

const app = createApp();
let adminToken: string;
let studentToken: string;
let pendingTeacherId: string;
let adminId: string;

beforeAll(async () => {
  await setupTestDB();

  // Obter token do Admin
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin@escola.com',
      senha: 'AdminSeguro@2027'
    });
  adminToken = adminLogin.body.data.token;
  adminId = adminLogin.body.data.usuario.id;

  // Criar aluno e obter token
  const student = await User.create({
    nome: 'Aluno Teste Permissao',
    email: 'aluno.perm@teste.com',
    senha: 'senha123456',
    role: 'ALUNO',
    status: 'ATIVO'
  });

  const studentLogin = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'aluno.perm@teste.com',
      senha: 'senha123456'
    });
  studentToken = studentLogin.body.data.token;

  // Criar professor pendente
  const pendingTeacher = await User.create({
    nome: 'Professor Esperando',
    email: 'esperando@teste.com',
    senha: 'senha123456',
    role: 'PROFESSOR',
    status: 'PENDENTE'
  });
  pendingTeacherId = pendingTeacher._id.toString();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('2. Suíte de Testes de Administração e Aprovação', () => {
  it('aluno não deve conseguir acessar rotas administrativas (/api/users)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('administrador deve conseguir listar todos os usuários', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.usuarios)).toBe(true);
  });

  it('administrador deve aprovar professor pendente com sucesso', async () => {
    const res = await request(app)
      .patch(`/api/users/${pendingTeacherId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.usuario.status).toBe('ATIVO');

    // Agora o professor aprovado deve conseguir fazer login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'esperando@teste.com',
        senha: 'senha123456'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();
  });

  it('deve PROTEGER o último administrador contra auto-rebaixamento', async () => {
    const res = await request(app)
      .patch(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'ALUNO'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CANNOT_DEMOTE_LAST_ADMIN');
  });

  it('deve PROTEGER o último administrador contra bloqueio', async () => {
    const res = await request(app)
      .patch(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'BLOQUEADO'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CANNOT_DEMOTE_LAST_ADMIN');
  });

  it('deve PROTEGER o último administrador contra exclusão', async () => {
    const res = await request(app)
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CANNOT_DELETE_LAST_ADMIN');
  });

  it('deve permitir rebaixar um admin caso exista outro administrador ativo', async () => {
    // Criar segundo admin
    const admin2 = await User.create({
      nome: 'Segundo Admin',
      email: 'admin2@escola.com',
      senha: 'senha123456',
      role: 'ADMIN',
      status: 'ATIVO'
    });

    // Agora rebaixar o segundo admin deve ser permitido
    const res = await request(app)
      .patch(`/api/users/${admin2._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'PROFESSOR'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.usuario.role).toBe('PROFESSOR');
  });
});
