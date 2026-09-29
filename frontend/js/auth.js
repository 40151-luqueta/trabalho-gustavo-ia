import { api, setToken, setCurrentUser, getCurrentUser, showToast } from './api.js';

export async function login(email, senha) {
  try {
    const res = await api.post('/auth/login', { email, senha });
    setToken(res.data.token);
    setCurrentUser(res.data.usuario);
    showToast('Login realizado com sucesso!', 'success');
    return res.data.usuario;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

export async function register(nome, email, senha, role) {
  try {
    const res = await api.post('/auth/register', { nome, email, senha, role });
    showToast(res.data.mensagem || 'Cadastro realizado com sucesso!', 'success');
    return res.data.usuario;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

export function logout() {
  setToken(null);
  setCurrentUser(null);
  showToast('Você saiu do sistema.', 'info');
  window.location.href = '/index.html';
}

/**
 * Atualiza o cabeçalho de navegação conforme o usuário logado
 */
export function setupNavHeader() {
  const user = getCurrentUser();
  const navContainer = document.getElementById('nav-user-actions');
  if (!navContainer) return;

  if (user) {
    const roleClass = user.role === 'ADMIN' ? 'role-admin' : user.role === 'PROFESSOR' ? 'role-professor' : 'role-aluno';
    let dashboardLink = '';

    if (user.role === 'ADMIN') {
      dashboardLink = `<li><a href="/admin.html">Painel Admin</a></li>`;
    } else if (user.role === 'PROFESSOR') {
      dashboardLink = `<li><a href="/professor.html">Painel do Professor</a></li>`;
    }

    navContainer.innerHTML = `
      ${dashboardLink}
      <li class="user-badge">
        <span>${user.nome}</span>
        <span class="role-tag ${roleClass}">${user.role}</span>
      </li>
      <li>
        <button id="btn-logout" class="btn btn-secondary btn-sm">Sair</button>
      </li>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', logout);
  } else {
    navContainer.innerHTML = `
      <li><a href="/login.html" class="btn btn-primary btn-sm">Entrar / Cadastrar</a></li>
    `;
  }
}
