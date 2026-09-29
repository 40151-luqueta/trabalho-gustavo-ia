import { api, showToast, getCurrentUser } from './api.js';

let labsCache = [];
let settingsCache = null;

export async function initProfessorDashboard() {
  const user = getCurrentUser();
  if (!user || user.role !== 'PROFESSOR') {
    showToast('Acesso restrito a professores.', 'error');
    window.location.href = '/login.html';
    return;
  }

  const welcomeEl = document.getElementById('prof-welcome-name');
  if (welcomeEl) welcomeEl.textContent = user.nome;

  await loadInitialData();
  await loadMyReservations();
  await loadMyRules();

  setupTabs();
  setupWizardListeners();
  checkPreselectedBooking();
}

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      tabButtons.forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(tabId)?.classList.add('active');
    });
  });
}

async function loadInitialData() {
  try {
    const [labsRes, settingsRes] = await Promise.all([
      api.get('/labs'),
      api.get('/settings')
    ]);

    labsCache = labsRes.data.laboratorios || [];
    settingsCache = settingsRes.data.configuracoes;

    // Preencher select de laboratórios
    const labSelect = document.getElementById('res-lab');
    if (labSelect) {
      labSelect.innerHTML = `
        <option value="">Selecione um laboratório...</option>
        ${labsCache.map((l) => `<option value="${l.id}">${l.nome} (${l.capacidade} lugares - ${l.localizacao || 'Campus'})</option>`).join('')}
      `;
    }

    // Preencher select de aulas
    const aulaSelect = document.getElementById('res-aula');
    if (aulaSelect && settingsCache?.lessons) {
      aulaSelect.innerHTML = `
        <option value="">Selecione a aula / horário...</option>
        ${settingsCache.lessons.map((ls) => `<option value="${ls.numero}">${ls.nome} (${ls.horarioInicio} - ${ls.horarioFim})</option>`).join('')}
      `;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function loadMyReservations() {
  const listEl = document.getElementById('my-reservations-list');
  if (!listEl) return;

  try {
    listEl.innerHTML = '<div style="padding: 1.5rem; color: var(--text-dim);">Carregando suas reservas...</div>';
    const res = await api.get('/reservations?minhas=true&status=CONFIRMADA');
    const reservas = res.data.reservas || [];

    if (reservas.length === 0) {
      listEl.innerHTML = '<div class="alert alert-info">Você ainda não possui reservas ativas confirmadas.</div>';
      return;
    }

    listEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${reservas
          .map((r) => {
            const labNome = r.laboratorioId?.nome || 'Laboratório';
            return `
              <div class="dashboard-card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: gap; gap: 1rem;">
                <div>
                  <div style="font-weight: 700; font-size: 1.05rem; color: #fff;">${labNome} — Aula ${r.aula}</div>
                  <div style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.2rem;">
                    📅 <strong>${formatDateBR(r.data)}</strong>
                    ${r.observacao ? ` &bull; <span>${r.observacao}</span>` : ''}
                  </div>
                </div>
                <div>
                  <button class="btn btn-danger btn-sm" onclick="window.cancelMyReservation('${r.id}')">Cancelar Reserva</button>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  } catch (err) {
    listEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

export async function loadMyRules() {
  const rulesEl = document.getElementById('my-rules-list');
  if (!rulesEl) return;

  try {
    const res = await api.get('/rules');
    const regras = res.data.regras || [];

    if (regras.length === 0) {
      rulesEl.innerHTML = `
        <div class="alert alert-info">
          Você não possui regras restritivas cadastradas pela coordenação.
          Pode solicitar reservas em qualquer dia útil dentro da janela escolar de ${settingsCache?.reservationWindowWeeks || 4} semanas!
        </div>
      `;
      return;
    }

    const diaMap = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 7: 'Domingo' };

    rulesEl.innerHTML = `
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
                  <div><strong>Dias permitidos:</strong> ${diasStr}</div>
                  ${reg.semanas && reg.semanas.length ? `<div><strong>Semanas autorizadas:</strong> ${reg.semanas.join(', ')}</div>` : ''}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  } catch (err) {
    rulesEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function setupWizardListeners() {
  const dateInput = document.getElementById('res-date');
  const labSelect = document.getElementById('res-lab');
  const aulaSelect = document.getElementById('res-aula');
  const btnVerify = document.getElementById('btn-verify-booking');
  const btnConfirm = document.getElementById('btn-confirm-booking');

  const checkEligibility = async () => {
    const data = dateInput?.value;
    const laboratorioId = labSelect?.value;
    const aula = aulaSelect?.value;
    const feedbackEl = document.getElementById('booking-evaluation-box');
    const summaryCard = document.getElementById('booking-summary-card');

    if (!data || !laboratorioId || !aula) {
      if (feedbackEl) feedbackEl.innerHTML = '';
      if (summaryCard) summaryCard.style.display = 'none';
      if (btnConfirm) btnConfirm.disabled = true;
      return;
    }

    try {
      feedbackEl.innerHTML = '<div style="color: var(--text-dim); padding: 0.5rem 0;">Verificando elegibilidade e disponibilidade...</div>';
      const checkRes = await api.post('/reservations/check', {
        laboratorioId,
        data,
        aula: Number(aula)
      });

      const { elegivel, disponivel, motivo, detalhes, isExcecao } = checkRes.data;

      if (elegivel && disponivel) {
        feedbackEl.innerHTML = `
          <div class="alert alert-success">
            <strong>✓ Elegível para Reserva!</strong>
            <div>${motivo}</div>
            ${isExcecao ? '<div style="margin-top: 4px; font-weight: 700;">★ Autorizado pela regra de antecedência excepcional.</div>' : ''}
          </div>
        `;

        if (summaryCard) {
          summaryCard.style.display = 'block';
          document.getElementById('sum-teacher').textContent = detalhes?.professor || 'Você';
          document.getElementById('sum-lab').textContent = detalhes?.laboratorio || '';
          document.getElementById('sum-date').textContent = formatDateBR(detalhes?.data);
          document.getElementById('sum-lesson').textContent = `Aula ${detalhes?.aula} (${detalhes?.horario})`;
          document.getElementById('sum-status').textContent = 'Disponível';
        }

        if (btnConfirm) btnConfirm.disabled = false;
      } else {
        feedbackEl.innerHTML = `
          <div class="alert ${!disponivel ? 'alert-danger' : 'alert-warning'}">
            <strong>${!disponivel ? '✕ Laboratório Ocupado' : '⚠ Restrição de Horário'}</strong>
            <div>${motivo}</div>
          </div>
        `;
        if (summaryCard) summaryCard.style.display = 'none';
        if (btnConfirm) btnConfirm.disabled = true;
      }
    } catch (err) {
      feedbackEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      if (btnConfirm) btnConfirm.disabled = true;
    }
  };

  dateInput?.addEventListener('change', checkEligibility);
  labSelect?.addEventListener('change', checkEligibility);
  aulaSelect?.addEventListener('change', checkEligibility);
  btnVerify?.addEventListener('click', checkEligibility);

  // Botão de confirmação de reserva
  btnConfirm?.addEventListener('click', async () => {
    const data = dateInput?.value;
    const laboratorioId = labSelect?.value;
    const aula = Number(aulaSelect?.value);
    const observacao = document.getElementById('res-obs')?.value;

    try {
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Gravando reserva...';

      await api.post('/reservations', {
        laboratorioId,
        data,
        aula,
        observacao
      });

      showToast('Reserva realizada com sucesso!', 'success');
      document.getElementById('booking-summary-card').style.display = 'none';
      document.getElementById('booking-evaluation-box').innerHTML = `
        <div class="alert alert-success">Reserva criada com sucesso! Você pode visualizá-la na aba 'Minhas Reservas'.</div>
      `;

      // Limpar formulário e recarregar reservas
      await loadMyReservations();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnConfirm.disabled = false;
      btnConfirm.textContent = 'Confirmar Agendamento';
    }
  });
}

window.cancelMyReservation = async function (id) {
  if (!confirm('Deseja realmente cancelar esta reserva? O horário será liberado imediatamente.')) {
    return;
  }
  try {
    await api.delete(`/reservations/${id}`);
    showToast('Reserva cancelada com sucesso.', 'info');
    await loadMyReservations();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

function checkPreselectedBooking() {
  const pre = sessionStorage.getItem('preselect_reservation');
  if (pre) {
    try {
      const data = JSON.parse(pre);
      sessionStorage.removeItem('preselect_reservation');

      const dateInput = document.getElementById('res-date');
      const labSelect = document.getElementById('res-lab');
      const aulaSelect = document.getElementById('res-aula');

      if (dateInput) dateInput.value = data.data;
      if (labSelect) labSelect.value = data.labId;
      if (aulaSelect) aulaSelect.value = data.aula;

      // Disparar validação
      setTimeout(() => {
        document.getElementById('btn-verify-booking')?.click();
      }, 300);
    } catch {
      // Ignora erro de parsing
    }
  }
}

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
