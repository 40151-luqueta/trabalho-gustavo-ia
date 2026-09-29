# Documentação da API REST

Todas as respostas da API seguem o padrão padronizado:
- **Sucesso**: `{ "success": true, "data": ... }`
- **Erro**: `{ "success": false, "error": { "code": "STRING_CODE", "message": "Mensagem descritiva" } }`

---

## 1. Autenticação (`/api/auth`)

### 1.1 Registrar Usuário
- **Método**: `POST`
- **URL**: `/api/auth/register`
- **Autenticação**: Não
- **Permissão**: Nenhuma
- **Body**:
```json
{
  "nome": "João Silva",
  "email": "joao.silva@escola.com",
  "senha": "SenhaForte@123",
  "role": "PROFESSOR" // ou "ALUNO"
}
```
- **Respostas**:
  - `201 Created`:
```json
{
  "success": true,
  "data": {
    "usuario": {
      "id": "65b...",
      "nome": "João Silva",
      "email": "joao.silva@escola.com",
      "role": "PROFESSOR",
      "status": "PENDENTE"
    },
    "mensagem": "Cadastro realizado com sucesso. Professores necessitam de aprovação do administrador."
  }
}
```
  - `400 Bad Request`: `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Email já cadastrado." } }`

---

### 1.2 Login
- **Método**: `POST`
- **URL**: `/api/auth/login`
- **Autenticação**: Não
- **Permissão**: Nenhuma
- **Body**:
```json
{
  "email": "joao.silva@escola.com",
  "senha": "SenhaForte@123"
}
```
- **Respostas**:
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "usuario": {
      "id": "65b...",
      "nome": "João Silva",
      "email": "joao.silva@escola.com",
      "role": "PROFESSOR",
      "status": "ATIVO"
    }
  }
}
```
  - `401 Unauthorized`: `{ "success": false, "error": { "code": "AUTH_INVALID_CREDENTIALS", "message": "Credenciais inválidas." } }`
  - `403 Forbidden`: `{ "success": false, "error": { "code": "USER_NOT_APPROVED", "message": "Cadastro de professor pendente de aprovação." } }`
  - `403 Forbidden`: `{ "success": false, "error": { "code": "USER_BLOCKED", "message": "Usuário bloqueado pelo administrador." } }`

---

### 1.3 Dados do Usuário Logado
- **Método**: `GET`
- **URL**: `/api/auth/me`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: Qualquer usuário autenticado
- **Respostas**:
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "id": "65b...",
    "nome": "João Silva",
    "email": "joao.silva@escola.com",
    "role": "PROFESSOR",
    "status": "ATIVO"
  }
}
```

---

## 2. Usuários e Administração (`/api/users`)

### 2.1 Listar Usuários
- **Método**: `GET`
- **URL**: `/api/users`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: `ADMIN`
- **Parâmetros de Query**: `role` (opcional), `status` (opcional), `busca` (opcional)
- **Respostas**: `200 OK`

### 2.2 Aprovar Professor
- **Método**: `PATCH`
- **URL**: `/api/users/:id/approve`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: `ADMIN`
- **Respostas**: `200 OK`

### 2.3 Atualizar Papel / Status / Dados do Usuário
- **Método**: `PATCH`
- **URL**: `/api/users/:id`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: `ADMIN`
- **Body**: `{ "role": "PROFESSOR", "status": "ATIVO", "nome": "..." }`
- **Proteção**: Impede rebaixamento ou bloqueio do último administrador (`CANNOT_DEMOTE_LAST_ADMIN`)

### 2.4 Excluir Usuário
- **Método**: `DELETE`
- **URL**: `/api/users/:id`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: `ADMIN`
- **Proteção**: Impede exclusão do último administrador (`CANNOT_DELETE_LAST_ADMIN`)

---

## 3. Laboratórios (`/api/labs`)

### 3.1 Listar Laboratórios
- **Método**: `GET`
- **URL**: `/api/labs`
- **Autenticação**: Não (leitura pública dos laboratórios ativos) / Sim (administradores veem inativos)
- **Respostas**: `200 OK`

### 3.2 Criar Laboratório
- **Método**: `POST`
- **URL**: `/api/labs`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: `ADMIN`

### 3.3 Atualizar Laboratório
- **Método**: `PATCH`
- **URL**: `/api/labs/:id`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: `ADMIN`

### 3.4 Desativar / Excluir Laboratório
- **Método**: `DELETE`
- **URL**: `/api/labs/:id`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: `ADMIN`

---

## 4. Equipamentos (`/api/equipments`)

### 4.1 Listar Equipamentos por Laboratório
- **Método**: `GET`
- **URL**: `/api/labs/:laboratorioId/equipments`
- **Autenticação**: Opcional (visível a todos para transparência técnica)

### 4.2 Cadastrar Equipamento
- **Método**: `POST`
- **URL**: `/api/labs/:laboratorioId/equipments`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: `ADMIN`

### 4.3 Editar Equipamento
- **Método**: `PATCH`
- **URL**: `/api/equipments/:id`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: `ADMIN`

### 4.4 Excluir Equipamento
- **Método**: `DELETE`
- **URL**: `/api/equipments/:id`
- **Autenticação**: Sim (`Bearer <token>`)
- **Permissão**: `ADMIN`

---

## 5. Regras de Reserva dos Professores (`/api/rules`)

### 5.1 Listar Regras
- **Método**: `GET`
- **URL**: `/api/rules` (com filtro `professorId` ou minhas regras para professor logado)
- **Autenticação**: Sim
- **Permissão**: `PROFESSOR` (apenas as suas) ou `ADMIN` (todas)

### 5.2 Criar Regra
- **Método**: `POST`
- **URL**: `/api/rules`
- **Autenticação**: Sim
- **Permissão**: `ADMIN`

### 5.3 Atualizar Regra
- **Método**: `PATCH`
- **URL**: `/api/rules/:id`
- **Autenticação**: Sim
- **Permissão**: `ADMIN`

### 5.4 Excluir Regra
- **Método**: `DELETE`
- **URL**: `/api/rules/:id`
- **Autenticação**: Sim
- **Permissão**: `ADMIN`

---

## 6. Reservas (`/api/reservations`)

### 6.1 Listar Reservas
- **Método**: `GET`
- **URL**: `/api/reservations`
- **Parâmetros**: `dataInicio`, `dataFim`, `laboratorioId`, `professorId`
- **Autenticação**: Sim
- **Permissão**: `PROFESSOR` (vê suas e disponibilidade) / `ADMIN` (todas)

### 6.2 Criar Reserva
- **Método**: `POST`
- **URL**: `/api/reservations`
- **Autenticação**: Sim
- **Permissão**: `PROFESSOR` (ativo) ou `ADMIN` (alunos rejeitados com `403 Forbidden`)
- **Body**:
```json
{
  "laboratorioId": "65b...",
  "data": "2027-04-12",
  "aula": 3,
  "observacao": "Aula prática de redes",
  "finalidade": "Turma 3º B"
}
```
- **Respostas**:
  - `201 Created`: Reserva confirmada com sucesso
  - `409 Conflict`: `{ "success": false, "error": { "code": "RESERVATION_CONFLICT", "message": "O laboratório já está reservado para esta aula." } }`
  - `422 Unprocessable`: `{ "success": false, "error": { "code": "RESERVATION_OUTSIDE_WINDOW", "message": "Data fora da janela permitida de 4 semanas." } }`
  - `403 Forbidden`: `{ "success": false, "error": { "code": "RESERVATION_NOT_ALLOWED", "message": "Você não possui autorização regular para este dia. A regra de exceção de 1 dia não se aplica para esta data." } }`

### 6.3 Verificar Elegibilidade e Disponibilidade Prévia
- **Método**: `POST`
- **URL**: `/api/reservations/check`
- **Autenticação**: Sim
- **Permissão**: `PROFESSOR` (ativo) ou `ADMIN`
- **Body**: `{ "laboratorioId": "...", "data": "2027-04-12", "aula": 3 }`
- **Respostas**:
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "disponivel": true,
    "elegivel": true,
    "isExcecao": false,
    "motivo": "Horário disponível e elegível para agendamento.",
    "detalhes": {
      "professor": "Prof. Roberto",
      "laboratorio": "Lab 1",
      "data": "2027-04-12",
      "aula": 3,
      "horario": "08:55 - 09:45",
      "status": "Disponível"
    }
  }
}
```

### 6.4 Cancelar Reserva
- **Método**: `DELETE`
- **URL**: `/api/reservations/:id`
- **Autenticação**: Sim
- **Permissão**: Dono da reserva (`PROFESSOR`) ou `ADMIN`

---

## 7. Programação Pública (`/api/public`)

### 7.1 Consultar Grade Pública dos Laboratórios
- **Método**: `GET`
- **URL**: `/api/public/schedule`
- **Autenticação**: Não (Livre e pública)
- **Parâmetros**: `data` (ex: `2027-04-12`), ou `semana`
- **Retorno Seguro**:
```json
{
  "success": true,
  "data": {
    "data": "2027-04-12",
    "diaSemana": "Segunda-feira",
    "laboratorios": [
      { "id": "...", "codigo": "lab1", "nome": "Lab 1" }
    ],
    "aulas": [
      { "numero": 1, "horario": "07:00 - 07:50" }
    ],
    "grade": [
      {
        "aula": 1,
        "laboratorioId": "...",
        "laboratorioNome": "Lab 1",
        "status": "RESERVADO",
        "responsavel": "Prof. João Silva"
      },
      {
        "aula": 1,
        "laboratorioId": "...",
        "laboratorioNome": "Lab 2",
        "status": "LIVRE",
        "responsavel": null
      }
    ]
  }
}
```
- **Respostas**: `200 OK`

### 7.2 Informações Gerais Escolares dos Laboratórios
- **Método**: `GET`
- **URL**: `/api/public/info`
- **Autenticação**: Não
- **Respostas**:
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "laboratorios": [ ... ],
    "aulas": [ ... ],
    "diasLetivos": [ 1, 2, 3, 4, 5 ],
    "janelaSemanas": 4,
    "antecedenciaExcepcionalDias": 1
  }
}
```

---

## 8. Configurações do Sistema (`/api/settings`)

### 8.1 Obter Configurações
- **Método**: `GET`
- **URL**: `/api/settings`
- **Autenticação**: Não (dados gerais como semanas e aulas para o calendário) / Sim para admin

### 8.2 Atualizar Configurações
- **Método**: `PATCH`
- **URL**: `/api/settings`
- **Autenticação**: Sim
- **Permissão**: `ADMIN`
- **Body**:
```json
{
  "reservationWindowWeeks": 6,
  "exceptionAdvanceDays": 2
}
```
