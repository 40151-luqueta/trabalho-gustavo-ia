# Contexto Técnico Persistente do Projeto

## 1. Objetivo do Sistema
Desenvolver um sistema web completo e resiliente para gestão e reserva dos 5 laboratórios de informática de uma instituição escolar ("Lab 1", "Lab 2", "Lab 3", "Lab 4", "Lab Fund"), com suporte a expansão dinâmica da quantidade de laboratórios. O sistema controla autenticação de usuários, aprovação de professores pela administração, regras personalizadas de autorização por dia e semana, janela de antecedência configurável com regra de exceção emergencial, controle rígido de concorrência e conflitos de horários, inventário de equipamentos por laboratório e uma grade pública transparente sem expor dados sensíveis.

---

## 2. Stack Tecnológica
- **Backend**: Node.js v24 + TypeScript com framework Express.
- **Banco de Dados**: MongoDB com ODM Mongoose (índices únicos com filtro parcial para concorrência atômica).
- **Testes**: Jest + Supertest + `mongodb-memory-server` para testes de integração rápidos, isolados e sem necessidade de serviço MongoDB externo instalado.
- **Frontend**: HTML5, Vanilla CSS moderno (tokens de design CSS, micro-animações, dark glassmorphism e responsividade total), JavaScript modular (ES Modules).
- **Deploy**: Preparado para execução local (`npm run dev`) e deploy serverless na Vercel (`vercel.json` e `backend/api/index.ts`).

---

## 3. Estrutura de Pastas Implementada
```
/
├── backend/
│   ├── src/
│   │   ├── config/          # Conexão com MongoDB (pool & serverless cache), env.ts
│   │   ├── controllers/     # Controladores HTTP (auth, user, lab, equipment, rule, reservation, settings, public)
│   │   ├── middleware/      # Auth (JWT), autorização RBAC, rate limiter, errorHandler centralizado
│   │   ├── models/          # Schemas Mongoose (User, Lab, Equipment, ReservationRule, Reservation, SystemSettings)
│   │   ├── routes/          # Rotas REST (/api/auth, /api/users, /api/labs, /api/equipments, /api/rules, /api/reservations, /api/settings, /api/public)
│   │   ├── services/        # Regras de negócio (ReservationService: motor de regras e exceção de antecedência)
│   │   ├── utils/           # Funções utilitárias (dateUtils: calendário escolar, response.ts: respostas padronizadas)
│   │   ├── seed/            # Script seguro de inicialização de dados (seed.ts)
│   │   ├── app.ts           # Inicialização da aplicação Express
│   │   └── server.ts        # Ponto de entrada do servidor local
│   ├── api/
│   │   └── index.ts         # Handler serverless para a Vercel
│   ├── tests/               # 26 testes automatizados (auth, admin, reservations, public)
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── frontend/
│   ├── index.html           # Página principal / Programação pública em grade interativa
│   ├── login.html           # Tela de autenticação e registro (Aluno / Professor)
│   ├── professor.html       # Painel interativo do professor (assistente em 4 passos e cancelamentos)
│   ├── admin.html           # Painel administrativo completo (aprovações, usuários, labs, equipamentos, regras, configs)
│   ├── css/
│   │   ├── styles.css       # Estilização global e tokens de design
│   │   └── components.css   # Estilos de tabelas, botões, modais e badges
│   └── js/
│       ├── api.js           # Cliente HTTP centralizado e gerenciador de token/toasts
│       ├── auth.js          # Lógica de login, cadastro e sessão
│       ├── public.js        # Carregamento e filtros da tabela pública
│       ├── professor.js     # Lógica do painel do professor e assistente de reserva
│       └── admin.js         # Lógica de gestão do administrador
├── .env.example
├── Roadmap.md
├── Contexto.md
├── api.md
├── README.md
└── vercel.json
```

---

## 4. Modelos do MongoDB
1. **User (`users`)**:
   - `nome`: string
   - `email`: string (único, lowercase, indexado)
   - `senha`: string (hash bcrypt com salt 10)
   - `role`: enum (`'ALUNO'`, `'PROFESSOR'`, `'ADMIN'`)
   - `status`: enum (`'PENDENTE'`, `'ATIVO'`, `'BLOQUEADO'`)
   - `criadoEm`, `atualizadoEm`: timestamps

2. **Lab (`labs`)**:
   - `codigo`: string (ex: 'lab1', 'lab2', 'lab3', 'lab4', 'labfund') - único
   - `nome`: string (ex: 'Lab 1', 'Lab 2', etc.)
   - `descricao`: string
   - `capacidade`: number
   - `localizacao`: string
   - `ativo`: boolean (default: true)
   - `criadoEm`, `atualizadoEm`: timestamps

3. **Equipment (`equipments`)**:
   - `laboratorioId`: ObjectId ref Lab
   - `nome`: string (ex: 'Computador', 'Projetor')
   - `tipo`: string
   - `numeroPatrimonio`: string
   - `descricao`: string
   - `status`: enum (`'ATIVO'`, `'MANUTENCAO'`, `'INATIVO'`)
   - `criadoEm`, `atualizadoEm`: timestamps

4. **SystemSettings (`settings`)**:
   - `singletonKey`: string ('SYSTEM_SETTINGS_SINGLETON')
   - `reservationWindowWeeks`: number (default: 4, configurável pelo admin)
   - `exceptionAdvanceDays`: number (default: 1, configurável pelo admin)
   - `lessons`: array de `{ numero, nome, horarioInicio, horarioFim }` (6 aulas diárias de 50 min)
   - `schoolDays`: array de numbers (1 a 5, Segunda a Sexta)
   - `timezone`: string ('America/Sao_Paulo')

5. **ReservationRule (`reservation_rules`)**:
   - `professorId`: ObjectId ref User
   - `nome`: string
   - `tipo`: enum (`'RECORRENTE'`, `'PERIODO'`)
   - `diasSemana`: number[] (1 a 5 para seg a sex)
   - `semanas`: number[] (opcional, para semanas do mês)
   - `dataInicio`: Date (opcional)
   - `dataFim`: Date (opcional)
   - `laboratoriosPermitidos`: ObjectId[] ref Lab (opcional)
   - `ativo`: boolean (default: true)

6. **Reservation (`reservations`)**:
   - `laboratorioId`: ObjectId ref Lab
   - `usuarioId`: ObjectId ref User
   - `data`: string ('YYYY-MM-DD', preservando a data do calendário escolar)
   - `aula`: number (1 a 6)
   - `observacao`: string
   - `finalidade`: string
   - `status`: enum (`'CONFIRMADA'`, `'CANCELADA'`)
   - **Índice Composto Único**: `{ laboratorioId: 1, data: 1, aula: 1 }` com `partialFilterExpression: { status: 'CONFIRMADA' }`.

---

## 5. Regras de Negócio e de Autorização Implementadas
1. **Controle de Acesso (RBAC)**:
   - **ALUNO**: Acesso exclusivamente de leitura da grade pública e consulta de disponibilidade. Bloqueio rigoroso no backend (`STUDENT_CANNOT_RESERVE`, HTTP 403) para criação, alteração ou cancelamento de reservas e painel administrativo.
   - **PROFESSOR (PENDENTE)**: Login bloqueado com `USER_NOT_APPROVED` (HTTP 403) até que o administrador aprove o cadastro.
   - **PROFESSOR (ATIVO)**: Pode consultar suas regras, consultar disponibilidade prévia via endpoint `/api/reservations/check`, realizar reservas dentro das suas regras ou exceção de antecedência, e cancelar suas próprias reservas (liberando o horário).
   - **ADMIN**: Gestão total de usuários, aprovação de professores, criação e desativação de laboratórios, inventário de equipamentos, regras de professores e parâmetros do sistema.
2. **Proteção do Último Administrador**:
   - O sistema impede a exclusão (`CANNOT_DELETE_LAST_ADMIN`), bloqueio ou rebaixamento para aluno/professor (`CANNOT_DEMOTE_LAST_ADMIN`) de um administrador caso ele seja o único admin ativo do sistema.
3. **Decisão do Motor de Reservas (`ReservationService`)**:
   - Passo 1: Usuário autenticado e ativo? (Professor aprovado ou Administrador).
   - Passo 2: O laboratório está ativo e existe?
   - Passo 3: A aula solicitada existe nas configurações (1 a 6)?
   - Passo 4: A data é um dia letivo válido (segunda a sexta-feira)?
   - Passo 5: Se Admin: permissão irrestrita concedida para gerenciar e agendar.
   - Passo 6: Se Professor:
     - A data está dentro da janela de semanas configurada (`reservationWindowWeeks`, padrão: 4)?
     - Calcular a diferença em dias entre a data de hoje (calendário escolar) e a data da reserva:
       - Se `diasRestantes <= exceptionAdvanceDays` (padrão: 1 dia), a reserva é **PERMITIDA POR EXCEÇÃO DE ANTECEDÊNCIA**.
       - Caso contrário: verificar regras ativas cadastradas para o professor. Se não houver regra que cubra o dia da semana/período, a reserva é recusada com mensagem detalhada informando que a exceção emergencial permite reservas até X dias antes.
   - Passo 7: Verificar se já existe reserva confirmada para o mesmo laboratório, data e aula. Se existir, recusar com `RESERVATION_CONFLICT` (HTTP 409).
4. **Tratamento de Timezone**:
   - Tratamos as datas escolares no formato padronizado `YYYY-MM-DD` com timezone de referência `America/Sao_Paulo` para evitar desvios de UTC em viradas de dia.

---

## 6. Endpoints Existentes
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Usuários**: `GET /api/users`, `POST /api/users`, `GET /api/users/:id`, `PATCH /api/users/:id`, `DELETE /api/users/:id`, `PATCH /api/users/:id/approve`
- **Laboratórios**: `GET /api/labs`, `POST /api/labs`, `GET /api/labs/:id`, `PATCH /api/labs/:id`, `DELETE /api/labs/:id`
- **Equipamentos**: `GET /api/labs/:laboratorioId/equipments`, `POST /api/labs/:laboratorioId/equipments`, `GET /api/equipments`, `PATCH /api/equipments/:id`, `DELETE /api/equipments/:id`
- **Regras**: `GET /api/rules`, `POST /api/rules`, `PATCH /api/rules/:id`, `DELETE /api/rules/:id`
- **Reservas**: `GET /api/reservations`, `POST /api/reservations`, `POST /api/reservations/check`, `DELETE /api/reservations/:id`
- **Configurações**: `GET /api/settings`, `PATCH /api/settings`
- **Público**: `GET /api/public/schedule`, `GET /api/public/info`

---

## 7. Decisões Técnicas Importantes
- **TypeScript**: Adotado no backend para tipagem estrita de contratos, middlewares, modelos e requisições, evitando bugs comuns em runtime.
- **MongoDB Memory Server para Testes**: Permite que os 26 testes automatizados de integração rodem em qualquer máquina de desenvolvimento (mesmo sem serviço MongoDB local instalado) com fidelidade total a índices únicos e operações do Mongoose.
- **Vercel Serverless Handler**: Exporta a aplicação Express como função serverless em `backend/api/index.ts`, permitindo deploy sem servidor dedicado.
- **Parâmetros Dinâmicos Sem Hardcode**: Tanto a janela de agendamento em semanas quanto o prazo de antecedência excepcional são consultados em tempo de execução via `SystemSettings`, podendo ser ajustados dinamicamente pelo administrador.

---

## 8. Testes Existentes e Resultados
- **Total de Suítes**: 4 suítes (`auth.test.ts`, `admin.test.ts`, `reservations.test.ts`, `public.test.ts`)
- **Total de Testes**: 26 testes automatizados
- **Status**: 100% aprovados (26 passed, 0 failed)

---

## 9. Estado Atual do Projeto
- Projeto 100% implementado, testado e documentado.
- Backend, Frontend, Banco de Dados, Autenticação, Reservas, Regras, Painel Admin, Testes e Deploy finalizados.
