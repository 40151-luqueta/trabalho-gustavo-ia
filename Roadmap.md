# Roadmap do Projeto: Sistema de Reservas de Laboratórios de Informática

Legenda de Estados:
- `[ ]` Pendente
- `[~]` Em andamento
- `[x]` Concluído
- `[!]` Bloqueado

---

## Fases de Desenvolvimento

- [x] **Fase 1 — Fundação**
  - [x] Análise aprofundada dos requisitos (`prompt.txt`)
  - [x] Definição de arquitetura e modelagem
  - [x] Criação de `Roadmap.md`, `Contexto.md`, `api.md`
  - [x] Estruturação das pastas `/backend` e `/frontend`
  - [x] Configuração do backend Node.js + TypeScript com Express e Mongoose
  - [x] Criação de `.env.example` e suporte à conexão MongoDB e Vercel Serverless

- [x] **Fase 2 — Usuários e Autenticação**
  - [x] Modelos de Usuário (`role`: ALUNO, PROFESSOR, ADMIN; `status`: PENDENTE, ATIVO, BLOQUEADO)
  - [x] Registro com validação (Aluno já ativo, Professor com status PENDENTE)
  - [x] Login com verificação de credenciais e hashing seguro (bcrypt)
  - [x] Emissão e validação de token JWT
  - [x] Middlewares de autenticação e controle de acesso por papel (`role`) e `status`
  - [x] Endpoint `/api/auth/me`

- [x] **Fase 3 — Administração e Gestão de Usuários**
  - [x] Listagem, busca e filtragem de usuários
  - [x] Aprovação de professores pendentes (`PENDENTE` -> `ATIVO`)
  - [x] Promoção e rebaixamento de usuários (Aluno <-> Professor <-> Admin)
  - [x] Bloqueio e desbloqueio de usuários
  - [x] Regra de proteção: proibição da remoção ou auto-rebaixamento do último administrador

- [x] **Fase 4 — Laboratórios**
  - [x] Modelagem de laboratórios (slug, nome, capacidade, localização, ativo)
  - [x] CRUD de laboratórios com proteção contra exclusões destrutivas
  - [x] Seed inicial dos 5 laboratórios (Lab 1, Lab 2, Lab 3, Lab 4, Lab Fund)

- [x] **Fase 5 — Aulas e Horários**
  - [x] Modelagem e configuração das 6 aulas diárias de 50 minutos
  - [x] Associação a dias úteis (Segunda a Sexta)

- [x] **Fase 6 — Configurações Globais do Sistema**
  - [x] Modelo `SystemSettings` (janela de semanas padrão: 4 semanas; antecedência excepcional padrão: 1 dia; aulas; dias úteis)
  - [x] Endpoints `GET /api/settings` e `PATCH /api/settings` para controle do Admin sem hardcode

- [x] **Fase 7 — Regras de Reserva dos Professores**
  - [x] Modelagem de regras individuais de reserva por professor (`ReservationRule`: dias da semana, semanas, datas início/fim, ativo)
  - [x] CRUD de regras pelo administrador
  - [x] Associação de múltiplas regras por professor

- [x] **Fase 8 — Motor de Reservas e Validação de Concorrência**
  - [x] Motor de decisão de reserva: autenticação, papel/status, data na janela, regras do professor, verificação de exceção de antecedência configurável
  - [x] Conflitos de laboratório + data + aula impedidos no backend e via índice composto único no MongoDB
  - [x] Permissão de reservas simultâneas em laboratórios distintos no mesmo horário
  - [x] Admin com permissão de reserva direta irrestrita
  - [x] Cancelamento e consulta de reservas

- [x] **Fase 9 — Programação Pública**
  - [x] Endpoint público sem necessidade de login `GET /api/public/schedule`
  - [x] DTO público seguro (sem senhas, emails, tokens ou regras internas expostas)
  - [x] Grade com disponibilidade (RESERVADO / LIVRE) e nome do responsável

- [x] **Fase 10 — Equipamentos e Patrimônio**
  - [x] Modelagem de equipamentos vinculados ao laboratório (nome, tipo, patrimônio, descrição, status)
  - [x] CRUD de equipamentos pelo administrador
  - [x] Consulta pública/autenticada de equipamentos por laboratório

- [x] **Fase 11 — Frontend Completo**
  - [x] Design moderno, responsivo e dinâmico com Vanilla CSS e micro-animações
  - [x] Grade interativa da Programação Pública (filtros por data/semana/laboratório)
  - [x] Telas de Login e Cadastro (Aluno / Professor)
  - [x] Painel do Professor (minhas reservas, minhas regras, agendador interativo com feedback explicativo de recusa/sucesso)
  - [x] Painel Administrativo completo (Gestão de Usuários, Aprovações, Labs, Equipamentos, Regras, Configurações)

- [x] **Fase 12 — Testes Automatizados**
  - [x] Testes unitários e de integração com Jest, Supertest e MongoDB Memory Server (26 testes aprovados com 100% de sucesso)
  - [x] Testes de autenticação e proteção de rotas
  - [x] Testes de fluxo de aprovação de professores
  - [x] Testes de proteção do último administrador
  - [x] Testes de criação de reserva, bloqueio de duplicatas e concorrência
  - [x] Testes de regras semanais/dias e exceção de antecedência
  - [x] Testes da rota pública segura

- [x] **Fase 13 — Segurança e Boas Práticas**
  - [x] Rate limiting, Helmet, CORS configurável, sanitização
  - [x] Tratamento global de erros sem expor stack trace em produção

- [x] **Fase 14 — Deploy e Seed**
  - [x] Script de seed seguro (`npm run seed`)
  - [x] Configuração `vercel.json` para deploy Serverless na Vercel
  - [x] Documentação de deploy e `.env.example`

- [x] **Fase 15 — Revisão Final e Entrega**
  - [x] Verificação de todos os itens do `prompt.txt`
  - [x] Atualização final de `Roadmap.md`, `Contexto.md`, `api.md` e `README.md`
  - [x] Relatório de status completo
