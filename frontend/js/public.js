import { api, showToast, getCurrentUser } from './api.js';

let currentDateStr = '';
let currentScheduleData = null;

export async function initPublicSchedule() {
  const dateInput = document.getElementById('filter-date');
  const btnPrev = document.getElementById('btn-prev-day');
  const btnNext = document.getElementById('btn-next-day');
  const btnToday = document.getElementById('btn-today');

  // Carregar dados de hoje por padrão
  await loadSchedule();

  if (dateInput) {
    dateInput.value = currentDateStr;
    dateInput.addEventListener('change', (e) => {
      loadSchedule(e.target.value);
    });
  }

  btnPrev?.addEventListener('click', () => changeDay(-1));
  btnNext?.addEventListener('click', () => changeDay(1));
  btnToday?.addEventListener('click', () => {
    loadSchedule();
  });
}

export async function loadSchedule(dateStr) {
  const loadingEl = document.getElementById('schedule-loading');
  const tableEl = document.getElementById('schedule-table');
  const dateBadge = document.getElementById('current-date-display');
  const dateInput = document.getElementById('filter-date');

  try {
    if (loadingEl) loadingEl.style.display = 'block';

    const url = dateStr ? `/public/schedule?data=${dateStr}` : '/public/schedule';
    const res = await api.get(url);
    currentScheduleData = res.data;
    currentDateStr = currentScheduleData.data;

    if (dateInput) dateInput.value = currentDateStr;
    if (dateBadge) {
      dateBadge.innerHTML = `<strong>${currentScheduleData.diaSemanaNome}</strong>, ${formatDateBR(currentDateStr)}`;
    }

    renderScheduleTable(currentScheduleData);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

function changeDay(deltaDays) {
  if (!currentDateStr) return;
  const [y, m, d] = currentDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);

  // Pular finais de semana se necessário
  const day = date.getUTCDay();
  if (day === 0) { // Domingo
    date.setUTCDate(date.getUTCDate() + (deltaDays > 0 ? 1 : -2));
  } else if (day === 6) { // Sábado
    date.setUTCDate(date.getUTCDate() + (deltaDays > 0 ? 2 : -1));
  }

  const newYear = date.getUTCFullYear();
  const newMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const newDay = String(date.getUTCDate()).padStart(2, '0');
  loadSchedule(`${newYear}-${newMonth}-${newDay}`);
}

function renderScheduleTable(data) {
  const headerRow = document.getElementById('schedule-header-row');
  const tableBody = document.getElementById('schedule-body');
  if (!headerRow || !tableBody) return;

  // Montar cabeçalho com os Laboratórios
  headerRow.innerHTML = `
    <th class="lesson-col">Horário / Aula</th>
    ${data.laboratorios
      .map(
        (lab) => `
        <th style="cursor: pointer;" title="Clique para ver detalhes e equipamentos" onclick="window.viewLabDetails('${lab.id}', '${lab.nome}')">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>${lab.nome}</span>
            <span style="font-size: 0.7rem; font-weight: normal; background: var(--bg-glass); padding: 2px 6px; border-radius: 4px;">${lab.capacidade} lug. 🔍</span>
          </div>
        </th>
      `
      )
      .join('')}
  `;

  // Montar linhas com as Aulas
  tableBody.innerHTML = data.grade
    .map((aulaRow) => {
      const isPastRow = !!aulaRow.passada;
      return `
        <tr class="${isPastRow ? 'lesson-row-past' : ''}">
          <td class="lesson-col">
            <div class="lesson-name">${aulaRow.nomeAula}</div>
            <div class="lesson-time">${aulaRow.horario}</div>
            ${isPastRow ? '<div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 2px;">Encerrado</div>' : ''}
          </td>
          ${aulaRow.slots
            .map((slot) => {
              const isFree = slot.status === 'LIVRE';
              const isPast = isPastRow || !!slot.passado;
              const user = getCurrentUser();
              const canClick = isFree && !isPast && user && (user.role === 'PROFESSOR' || user.role === 'ADMIN');

              let badgeText = '■ RESERVADO';
              let cardClass = 'status-busy';

              if (isFree) {
                if (isPast) {
                  badgeText = '○ PASSADO';
                  cardClass = 'status-past';
                } else {
                  badgeText = '● LIVRE';
                  cardClass = 'status-free';
                }
              }

              return `
                <td>
                  <div class="slot-card ${cardClass}" 
                       ${canClick ? `style="cursor: pointer;" title="Clique para agendar" onclick="window.quickBook('${slot.laboratorioId}', '${data.data}', ${aulaRow.aula})"` : ''}>
                    <div class="slot-status-badge">
                      <span>${badgeText}</span>
                    </div>
                    ${!isFree ? `<div class="slot-teacher" title="Responsável">${slot.responsavel || 'Professor'}</div>` : ''}
                    ${canClick ? `<div style="font-size: 0.72rem; color: var(--primary); font-weight: 700; margin-top: 2px;">+ Agendar</div>` : ''}
                  </div>
                </td>
              `;
            })
            .join('')}
        </tr>
      `;
    })
    .join('');
}

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// Modal de detalhes e equipamentos do laboratório
window.viewLabDetails = async function (labId, labNome) {
  const modal = document.getElementById('modal-lab-details');
  const modalTitle = document.getElementById('modal-lab-title');
  const modalBody = document.getElementById('modal-lab-content');
  if (!modal || !modalBody) return;

  modalTitle.textContent = `Equipamentos do ${labNome}`;
  modalBody.innerHTML = '<div style="text-align: center; padding: 2rem;">Carregando equipamentos...</div>';
  modal.classList.add('active');

  try {
    const res = await api.get(`/labs/${labId}/equipments`);
    const equipamentos = res.data.equipamentos || [];

    if (equipamentos.length === 0) {
      modalBody.innerHTML = '<div class="alert alert-info">Nenhum equipamento específico registrado neste laboratório até o momento.</div>';
      return;
    }

    modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${equipamentos
          .map(
            (eq) => `
            <div style="background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); padding: 0.85rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <span style="font-weight: 700; color: #fff;">${eq.nome}</span>
                <span class="role-tag ${eq.status === 'ATIVO' ? 'role-aluno' : 'role-admin'}">${eq.status}</span>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-muted);">${eq.descricao || 'Sem descrição'}</div>
              ${eq.numeroPatrimonio ? `<div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.25rem;">Patrimônio: ${eq.numeroPatrimonio}</div>` : ''}
            </div>
          `
          )
          .join('')}
      </div>
    `;
  } catch (err) {
    modalBody.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
};

window.closeModal = function (modalId) {
  document.getElementById(modalId)?.classList.remove('active');
};

window.quickBook = function (labId, data, aula) {
  const user = getCurrentUser();
  if (user?.role === 'PROFESSOR' || user?.role === 'ADMIN') {
    sessionStorage.setItem('preselect_reservation', JSON.stringify({ labId, data, aula }));
    window.location.href = user.role === 'ADMIN' ? '/admin.html?tab=reservas' : '/professor.html';
  }
};
