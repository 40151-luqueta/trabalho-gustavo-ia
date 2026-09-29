# Sistema de Gerenciamento e Reserva de Laboratórios Escolares

Aplicação web completa para gerenciamento, autorização e agendamento dos laboratórios de informática de uma instituição de ensino.

---

## 🚀 Visão Geral e Recursos
- **5 Laboratórios Escolares Oficiais**: Lab 1, Lab 2, Lab 3, Lab 4 e Lab Fund (arquitetura expansível para novos laboratórios).
- **Controle de Acesso Baseado em Papéis (RBAC)**:
  - **Aluno**: Consulta livre da disponibilidade dos laboratórios e programação pública sem permissão para criar ou cancelar reservas.
  - **Professor**: Registro com estado inicial `PENDENTE` aguardando aprovação da administração. Uma vez aprovado (`ATIVO`), possui assistente interativo de agendamento em 4 passos e cancelamento de suas reservas.
  - **Administrador**: Gestão de usuários, aprovação de professores em 1 clique, CRUD de laboratórios, inventário de equipamentos por laboratório, regras de agendamento personalizadas e alteração de parâmetros globais.
- **Proteção do Último Administrador**: Regra de segurança fundamental que bloqueia exclusão ou auto-rebaixamento caso haja apenas um administrador ativo.
- **Motor de Regras Inteligente**:
  - Regras semanais e por dias úteis configuráveis por professor.
  - **Regra de Exceção por Antecedência**: Permite que professores agendem horários livres mesmo fora dos seus dias regulares se estiverem dentro da janela de antecedência configurada (padrão: 1 dia).
  - Janela de agendamento flexível (padrão: 4 semanas).
- **Proteção Concorrente e Anti-Conflito**: Prevenção rigorosa em nível de backend e através de índice composto único no MongoDB (`laboratorioId + data + aula`).
- **Tabela e Grade Pública Segura**: DTO público limpo sem expor senhas, hashes, emails ou tokens.
- **Deploy Serverless**: Pronto para deploy na Vercel com handler em `backend/api/index.ts` e `vercel.json`.

---

## 🛠 Stack Tecnológica
- **Backend**: Node.js, TypeScript, Express, Mongoose, JWT (jsonwebtoken), bcryptjs, Helmet, CORS, express-rate-limit.
- **Banco de Dados**: MongoDB (compatível com MongoDB local e MongoDB Atlas na nuvem).
- **Frontend**: HTML5, Vanilla CSS moderno (design system com CSS variables, micro-animações, dark glassmorphism e responsividade completa para celular, tablet e desktop), JavaScript modular ES Modules.
- **Testes**: Jest, Supertest, `mongodb-memory-server` para testes de integração rápidos e sem dependência de serviço externo.

---

## 📁 Estrutura do Projeto
```
/
├── backend/
│   ├── src/
│   │   ├── config/          # Conexão MongoDB e variáveis de ambiente
│   │   ├── controllers/     # Controladores REST
│   │   ├── middleware/      # Auth JWT, RBAC, Rate limiter e Error Handler
│   │   ├── models/          # Schemas Mongoose (User, Lab, Equipment, Reservation, ReservationRule, SystemSettings)
│   │   ├── routes/          # Rotas REST da API
│   │   ├── services/        # Motor de elegibilidade e regras de reservas
│   │   ├── utils/           # Respostas HTTP e manipulação de datas escolares
│   │   ├── seed/            # Script seguro de inicialização
│   │   ├── app.ts           # Configuração da aplicação Express
│   │   └── server.ts        # Ponto de entrada do servidor
│   ├── api/
│   │   └── index.ts         # Handler serverless da Vercel
│   ├── tests/               # 26 testes automatizados (unitários e de integração)
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── frontend/
│   ├── index.html           # Programação pública em grade interativa
│   ├── login.html           # Tela de autenticação e registro (Aluno / Professor)
│   ├── professor.html       # Painel interativo do professor
│   ├── admin.html           # Painel administrativo completo
│   ├── css/
│   │   ├── styles.css       # Design system e tokens visuais
│   │   └── components.css   # Estilos de tabelas, cards, modais e abas
│   └── js/
│       ├── api.js           # Cliente HTTP e gerenciador de token/toasts
│       ├── auth.js          # Sessão e controle de login/cadastro
│       ├── public.js        # Grade pública e modal de equipamentos
│       ├── professor.js     # Assistente de agendamento e cancelamentos
│       └── admin.js         # Operações e cadastros administrativos
├── .env.example
├── Roadmap.md
├── Contexto.md
├── api.md
├── README.md
└── vercel.json
```

---

## ⚙️ Como Configurar o MongoDB
1. **Opção 1: MongoDB Atlas (Nuvem - Recomendado para Vercel)**
   - Crie uma conta gratuita em [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
   - Crie um cluster gratuito (M0).
   - Crie um usuário de banco de dados e libere o IP de acesso (`0.0.0.0/0` para serverless).
   - Obtenha a Connection String no formato:
     ```
     mongodb+srv://<usuario>:<senha>@cluster.mongodb.net/laboratorios?retryWrites=true&w=majority
     ```
2. **Opção 2: MongoDB Local**
   - Caso possua o MongoDB instalado localmente:
     ```
     mongodb://localhost:27017/laboratorios
     ```
3. **Opção 3: Testes Automatizados**
   - Não requer nenhuma configuração de banco! Os testes utilizam `mongodb-memory-server` automaticamente.

---

## 💻 Como Executar Localmente

### 1. Clonar e Instalar Dependências
```bash
# Na raiz do projeto:
npm run install:all

# Ou acessando diretamente a pasta backend:
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo para `.env`:
```bash
cp .env.example backend/.env
```
Ajuste a `MONGODB_URI` e a `JWT_SECRET` se desejar.

### 3. Executar o Seed Inicial (Laboratórios, Aulas, Configurações e Primeiro Administrador)
```bash
# Na pasta backend:
npm run seed
```
Este comando criará com segurança:
- Os 5 laboratórios (Lab 1, Lab 2, Lab 3, Lab 4, Lab Fund)
- As 6 aulas diárias de 50 minutos
- As configurações de 4 semanas de janela e 1 dia de exceção
- O primeiro administrador do sistema

### 4. Iniciar a Aplicação
```bash
# Na pasta backend:
npm run dev
```
O servidor iniciará em `http://localhost:3000`.
- **Grade Pública**: Abra `http://localhost:3000` ou `http://localhost:3000/index.html`
- **Login / Cadastro**: `http://localhost:3000/login.html`
- **API REST**: `http://localhost:3000/api`

---

## 🧪 Como Executar os Testes Automatizados
O projeto conta com uma suíte de testes de integração com cobertura total dos requisitos solicitados:
```bash
cd backend
npm test
```
Resultados da suíte:
- `tests/auth.test.ts`: Registro, login, bloqueio, professor pendente e emissão de JWT.
- `tests/admin.test.ts`: Listagem de usuários, aprovação de professores, proteção estrita do último administrador.
- `tests/reservations.test.ts`: Criação de reserva, bloqueio de alunos, bloqueio de conflitos concorrentes, regras de professores, antecedência excepcional e cancelamento.
- `tests/public.test.ts`: Visualização da grade sem autenticação, status LIVRE/RESERVADO e proteção de dados sensíveis.

---

## ☁️ Como Fazer Deploy na Vercel
1. Instale a Vercel CLI ou conecte seu repositório no dashboard da [Vercel](https://vercel.com).
2. Adicione as seguintes Variáveis de Ambiente no painel da Vercel:
   - `MONGODB_URI`: Sua string de conexão do MongoDB Atlas.
   - `JWT_SECRET`: Chave secreta de produção.
   - `NODE_ENV`: `production`
   - `TIMEZONE`: `America/Sao_Paulo`
3. Execute o deploy:
   ```bash
   vercel --prod
   ```
4. O arquivo `vercel.json` na raiz cuidará automaticamente de servir os arquivos estáticos de `/frontend` e direcionar as rotas `/api/*` para a Serverless Function em `backend/api/index.ts`.

---

## 🔑 Credenciais de Teste para Desenvolvimento
> ⚠️ **Aviso de Segurança**: As credenciais abaixo foram criadas exclusivamente para fins de testes e homologação local.

| Papel | Email | Senha |
|---|---|---|
| **Administrador** | `admin@escola.com` | `AdminSeguro@2027` |
| **Professor (após cadastro)** | `professor@escola.com` | Senha definida no cadastro |
| **Aluno** | Qualquer email cadastrado na tela de registro | Senha definida no cadastro |
