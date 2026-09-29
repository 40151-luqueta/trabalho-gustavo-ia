import { api, showToast, getCurrentUser } from './api.js';

let usersCache = [];
let labsCache = [];
let teachersCache = [];

export async function initAdminDashboard() {
  const user = getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    showToast('Acesso restrito ao administrador.', 'error');
    window.location.href = '/login.html';
    return;
  }

  setupTabs();
  await loadDashboardStats();
  await loadPendingTeachers();
  await loadUsersList();
  await loadLabsList();
  await loadEquipmentsList();
  await loadRulesList();
  await loadSystemSettings();

  setupAdminEventListeners();
}

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get('tab');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      tabButtons.forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(tabId)?.classList.add('active');
    });
  });

  if (requestedTab) {
    const targetBtn = document.querySelector(`.tab-btn[data-tab="tab-${requestedTab}"]`);
    if (targetBtn) targetBtn.click();
  }
}

async function loadDashboardStats() {
  try {
    const [usersRes, labsRes, settingsRes] = await Promise.all([
      api.get('/users'),
      api.get('/labs'),
      api.get('/settings')
    ]);

    usersCache = usersRes.data.usuarios || [];
    labsCache = labsRes.data.laboratorios || [];
    teachersCache = usersCache.filter((u) => u.role === 'PROFESSOR' && u.status === 'ATIVO');

    const pendingCount = usersCache.filter((u) => u.role === 'PROFESSOR' && u.status === 'PENDENTE').length;

    const badgePending = document.getElementById('stat-pending-badge');
    if (badgePending) {
      badgePending.textContent = pendingCount;
      badgePending.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }

    const statUsers = document.getElementById('stat-total-users');
    const statLabs = document.getElementById('stat-total-labs');
    if (statUsers) statUsers.textContent = usersCache.length;
    if (statLabs) statLabs.textContent = labsCache.length;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 1. Aba: Aprovações Pendentes
export async function loadPendingTeachers() {
  const container = document.getElementById('pending-teachers-list');
  if (!container) return;

  const pendings = usersCache.filter((u) => u.role === 'PROFESSOR' && u.status === 'PENDENTE');

  if (pendings.length === 0) {
    container.innerHTML = '<div class="alert alert-success">✓ Nenhum professor aguardando aprovação no momento.</div>';
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
      ${pendings
        .map(
          (t) => `
          <div class="dashboard-card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-weight: 700; font-size: 1.05rem; color: #fff;">${t.nome}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">${t.email} &bull; Cadastrado em ${formatDateBR(t.criadoEm)}</div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-success btn-sm" onclick="window.approveTeacher('${t.id}')">✓ Aprovar Professor</button>
              <button class="btn btn-danger btn-sm" onclick="window.blockUser('${t.id}')">Bloquear</button>
            </div>
          </div>
        `
        )
        .join('')}
    </div>
  `;
}

window.approveTeacher = async function (id) {
  try {
    await api.patch(`/users/${id}/approve`, {});
    showToast('Professor aprovado com sucesso! Agora ele pode realizar reservas.', 'success');
    await loadDashboardStats();
    await loadPendingTeachers();
    await loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// 2. Aba: Gestão de Usuários
export async function loadUsersList() {
  const tableBody = document.getElementById('users-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = usersCache
    .map(
      (u) => `
      <tr>
        <td>
          <div style="font-weight: 600; color: #fff;">${u.nome}</div>
          <div style="font-size: 0.78rem; color: var(--text-dim);">${u.email}</div>
        </td>
        <td>
          <select class="input-control" style="padding: 0.3rem 0.5rem; font-size: 0.82rem;" onchange="window.changeUserRole('${u.id}', this.value)">
            <option value="ALUNO" ${u.role === 'ALUNO' ? 'selected' : ''}>Aluno</option>
            <option value="PROFESSOR" ${u.role === 'PROFESSOR' ? 'selected' : ''}>Professor</option>
            <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
          </select>
        </td>
        <td>
          <select class="input-control" style="padding: 0.3rem 0.5rem; font-size: 0.82rem;" onchange="window.changeUserStatus('${u.id}', this.value)">
            <option value="ATIVO" ${u.status === 'ATIVO' ? 'selected' : ''}>Ativo</option>
            <option value="PENDENTE" ${u.status === 'PENDENTE' ? 'selected' : ''}>Pendente</option>
            <option value="BLOQUEADO" ${u.status === 'BLOQUEADO' ? 'selected' : ''}>Bloqueado</option>
          </select>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" title="Excluir usuário" onclick="window.removeUser('${u.id}', '${u.nome}')">Excluir</button>
        </td>
      </tr>
    `
    )
    .join('');
}

window.changeUserRole = async function (id, newRole) {
  try {
    await api.patch(`/users/${id}`, { role: newRole });
    showToast(`Papel alterado para ${newRole} com sucesso!`, 'success');
    await loadDashboardStats();
    await loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
    await loadUsersList();
  }
};

window.changeUserStatus = async function (id, newStatus) {
  try {
    await api.patch(`/users/${id}`, { status: newStatus });
    showToast(`Status alterado para ${newStatus}!`, 'success');
    await loadDashboardStats();
    await loadPendingTeachers();
    await loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
    await loadUsersList();
  }
};

window.removeUser = async function (id, nome) {
  if (!confirm(`Deseja realmente remover o usuário "${nome}"? Esta ação cancelará quaisquer reservas associadas.`)) {
    return;
  }
  try {
    await api.delete(`/users/${id}`);
    showToast('Usuário removido com sucesso.', 'info');
    await loadDashboardStats();
    await loadPendingTeachers();
    await loadUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// 3. Aba: Laboratórios
export async function loadLabsList() {
  const listEl = document.getElementById('admin-labs-list');
  if (!listEl) return;

  listEl.innerHTML = labsCache
    .map(
      (lab) => `
      <div class="dashboard-card">
        <div class="card-title">
          <span>${lab.nome} (${lab.codigo})</span>
          <span class="role-tag ${lab.ativo ? 'role-aluno' : 'role-admin'}">${lab.ativo ? 'ATIVO' : 'DESATIVADO'}</span>
        </div>
        <div class="card-desc">
          <div>${lab.descricao || 'Sem descrição.'}</div>
          <div style="margin-top: 0.35rem; font-size: 0.8rem; color: var(--text-dim);">
            Capacidade: <strong>${lab.capacidade} lugares</strong> &bull; Local: ${lab.localizacao || 'Campus'}
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="window.toggleLabStatus('${lab.id}', ${!lab.ativo})">
            ${lab.ativo ? 'Desativar' : 'Reativar'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="window.deleteLab('${lab.id}', '${lab.nome}')">Excluir</button>
        </div>
      </div>
    `
    )
    .join('');
}

window.toggleLabStatus = async function (id, novoStatus) {
  try {
    await api.patch(`/labs/${id}`, { ativo: novoStatus });
    showToast('Status do laboratório atualizado com sucesso!', 'success');
    await loadDashboardStats();
    await loadLabsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteLab = async function (id, nome) {
  if (!confirm(`Deseja excluir o ${nome}? Isso só é permitido caso não existam reservas ativas.`)) {
    return;
  }
  try {
    await api.delete(`/labs/${id}`);
    showToast('Laboratório excluído com sucesso.', 'info');
    await loadDashboardStats();
    await loadLabsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// 4. Aba: Equipamentos
export async function loadEquipmentsList() {
  const container = document.getElementById('admin-equipments-list');
  const labSelect = document.getElementById('eq-lab-select');
  if (!container) return;

  if (labSelect) {
    labSelect.innerHTML = labsCache.map((l) => `<option value="${l.id}">${l.nome}</option>`).join('');
  }

  try {
    const res = await api.get('/equipments');
    const equipamentos = res.data.equipamentos || [];

    if (equipamentos.length === 0) {
      container.innerHTML = '<div class="alert alert-info">Nenhum equipamento cadastrado no momento.</div>';
      return;
    }

    container.innerHTML = `
      <div class="card-grid">
        ${equipamentos
          .map(
            (eq) => `
            <div class="dashboard-card">
              <div class="card-title">
                <span>${eq.nome}</span>
                <span class="role-tag ${eq.status === 'ATIVO' ? 'role-aluno' : 'role-admin'}">${eq.status}</span>
              </div>
              <div class="card-desc">
                <div><strong>Tipo:</strong> ${eq.tipo}</div>
                <div><strong>Laboratório:</strong> ${eq.laboratorioId?.nome || 'Nenhum'}</div>
                ${eq.numeroPatrimonio ? `<div><strong>Patrimônio:</strong> ${eq.numeroPatrimonio}</div>` : ''}
                <div style="margin-top: 4px;">${eq.descricao || ''}</div>
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button class="btn btn-danger btn-sm" onclick="window.removeEquipment('${eq.id}')">Excluir</button>
              </div>
            </div>
          `
          )
          .join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

window.removeEquipment = async function (id) {
  if (!confirm('Deseja excluir este equipamento do inventário?')) return;
  try {
    await api.delete(`/equipments/${id}`);
    showToast('Equipamento excluído com sucesso!', 'info');
    await loadEquipmentsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// 5. Aba: Regras dos Professores
export async function loadRulesList() {
  const container = document.getElementById('admin-rules-list');
  const profSelect = document.getElementById('rule-prof-select');
  if (!container) return;

  if (profSelect) {
    profSelect.innerHTML = teachersCache
      .map((t) => `<option value="${t.id}">${t.nome} (${t.email})</option>`)
      .join('');
  }

  try {
    const res = await api.get('/rules');
    const regras = res.data.regras || [];

    if (regras.length === 0) {
      container.innerHTML = '<div class="alert alert-info">Nenhuma regra personalizada cadastrada no momento.</div>';
      return;
    }

    const diaMap = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 7: 'Domingo' };

    container.innerHTML = `
      <div class="card-grid">
        ${regras
          .map((reg) => {
            const diasStr = reg.diasSemana.map((d) => diaMap[d] || d).join(', ');
            return `
              <div class="dashboard-card">
                <div class="card-title">
                  <span>${reg.nome}</span>
                  <span class="role-tag role-professor">${reg.tipo}</span>
                </div>
                <div class="card-desc">
                  <div><strong>Professor:</strong> ${reg.professorId?.nome || 'N/A'}</div>
                  <div><strong>Dias autorizados:</strong> ${diasStr}</div>
                </div>
                <div style="display: flex; justify-content: flex-end;">
                  <button class="btn btn-danger btn-sm" onclick="window.removeRule('${reg.id}')">Excluir Regra</button>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

window.removeRule = async function (id) {
  if (!confirm('Deseja excluir esta regra de reserva?')) return;
  try {
    await api.delete(`/rules/${id}`);
    showToast('Regra excluída com sucesso!', 'info');
    await loadRulesList();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// 6. Aba: Configurações Globais
export async function loadSystemSettings() {
  const windowWeeksInput = document.getElementById('cfg-window-weeks');
  const exceptionDaysInput = document.getElementById('cfg-exception-days');
  const timezoneInput = document.getElementById('cfg-timezone');

  try {
    const res = await api.get('/settings');
    const cfg = res.data.configuracoes;

    if (windowWeeksInput) windowWeeksInput.value = cfg.reservationWindowWeeks;
    if (exceptionDaysInput) exceptionDaysInput.value = cfg.exceptionAdvanceDays;
    if (timezoneInput) timezoneInput.value = cfg.timezone;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function setupAdminEventListeners() {
  // Formulário de Cadastro de Laboratório
  document.getElementById('form-create-lab')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo = document.getElementById('lab-code')?.value;
    const nome = document.getElementById('lab-name')?.value;
    const capacidade = document.getElementById('lab-cap')?.value;
    const localizacao = document.getElementById('lab-loc')?.value;
    const descricao = document.getElementById('lab-desc')?.value;

    try {
      await api.post('/labs', { codigo, nome, capacidade: Number(capacidade), localizacao, descricao });
      showToast('Laboratório criado com sucesso!', 'success');
      e.target.reset();
      await loadDashboardStats();
      await loadLabsList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Formulário de Equipamento
  document.getElementById('form-create-equipment')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const labId = document.getElementById('eq-lab-select')?.value;
    const nome = document.getElementById('eq-name')?.value;
    const tipo = document.getElementById('eq-type')?.value;
    const numeroPatrimonio = document.getElementById('eq-pat')?.value;
    const descricao = document.getElementById('eq-desc')?.value;

    try {
      await api.post(`/labs/${labId}/equipments`, { nome, tipo, numeroPatrimonio, descricao });
      showToast('Equipamento cadastrado com sucesso!', 'success');
      e.target.reset();
      await loadEquipmentsList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Formulário de Regra de Professor
  document.getElementById('form-create-rule')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const professorId = document.getElementById('rule-prof-select')?.value;
    const nome = document.getElementById('rule-name')?.value;
    const diasCheckboxes = document.querySelectorAll('input[name="rule-day"]:checked');
    const diasSemana = Array.from(diasCheckboxes).map((cb) => Number(cb.value));

    if (diasSemana.length === 0) {
      showToast('Selecione pelo menos um dia da semana para a regra.', 'error');
      return;
    }

    try {
      await api.post('/rules', { professorId, nome, diasSemana, tipo: 'RECORRENTE' });
      showToast('Regra criada com sucesso!', 'success');
      e.target.reset();
      await loadRulesList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Salvar Configurações
  document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
    const reservationWindowWeeks = Number(document.getElementById('cfg-window-weeks')?.value);
    const exceptionAdvanceDays = Number(document.getElementById('cfg-exception-days')?.value);
    const timezone = document.getElementById('cfg-timezone')?.value;

    try {
      await api.patch('/settings', { reservationWindowWeeks, exceptionAdvanceDays, timezone });
      showToast('Configurações globais salvas com sucesso!', 'success');
      await loadSystemSettings();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR');
}
