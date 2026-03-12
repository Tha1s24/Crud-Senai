import { apiRequest, setToken } from "./api.js";
import { $, showAlert, hideAlert } from "./utils.js";

// Cache local de usuários e dados do usuário logado
let usersCache = [];

/**
 * Recupera o usuário logado do localStorage [3]
 */
function getLoggedUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

/**
 * Inicializa a página de usuários
 */
export async function initUsersPage() {
  const form = $("#userForm");
  const alertEl = $("#alertUsers");
  const userInfoEl = $("#loggedUserInfo"); // Elemento no HTML para exibir usuário [3]
  const logoutBtn = $("#logoutBtn");

  const loggedUser = getLoggedUser();

  // 1. Exibe informações do usuário no cabeçalho [3]
  if (loggedUser && userInfoEl) {
    userInfoEl.textContent = `Logado como: ${loggedUser.name} (${loggedUser.profile})`;
  }

  // 2. Bloqueia o formulário visualmente para quem não é ADMIN [3]
  if (!loggedUser || loggedUser.profile !== "ADMIN") {
    if (form) form.style.display = "none";
  }

  // 3. Configura o Logout [3]
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      setToken(null);
      localStorage.removeItem("user");
      window.location.href = "./login.html";
    });
  }

  // 4. Carrega a lista inicial da API [1]
  await loadUsersFromApi(alertEl);

  // 5. Configura o envio do formulário (apenas se o formulário existir/estiver visível)
  if (form) {
    form.addEventListener("submit", (e) => handleSaveUser(e, alertEl));
  }
}

/**
 * Busca a lista real de usuários via API [1]
 */
async function loadUsersFromApi(alertEl) {
  try {
    const list = await apiRequest("/api/users");
    usersCache = list;
    render(usersCache);
  } catch (err) {
    handleApiError(err, alertEl);
  }
}

/**
 * Renderiza a tabela de forma segura (Anti-XSS) [1, 3]
 */
function render(users) {
  const listEl = $("#usersList");
  if (!listEl) return;

  listEl.innerHTML = "";
  const loggedUser = getLoggedUser();

  users.forEach((u) => {
    const tr = document.createElement("tr");

    // Criação de células usando textContent para evitar XSS [1]
    const tdName = document.createElement("td");
    tdName.textContent = u.name;

    const tdEmail = document.createElement("td");
    tdEmail.textContent = u.email;

    const tdProfile = document.createElement("td");
    tdProfile.textContent = u.profile;

    const tdStatus = document.createElement("td");
    tdStatus.textContent = u.status;

    const tdActions = document.createElement("td");

    // Controle visual: Ações de edição/exclusão apenas para ADMIN [3]
    if (loggedUser && loggedUser.profile === "ADMIN") {
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn-ghost";
      btnEdit.textContent = "Editar";
      btnEdit.onclick = () => fillForm(u);

      const btnToggle = document.createElement("button");
      btnToggle.className = u.status === "ACTIVE" ? "btn-danger" : "btn-ok";
      btnToggle.textContent = u.status === "ACTIVE" ? "Inativar" : "Ativar";
      btnToggle.onclick = () => toggleStatus(u.id, u.status);

      tdActions.appendChild(btnEdit);
      tdActions.appendChild(btnToggle);
    }

    tr.appendChild(tdName);
    tr.appendChild(tdEmail);
    tr.appendChild(tdProfile);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);

    listEl.appendChild(tr);
  });
}

/**
 * Salva ou atualiza um usuário via API (POST/PUT) [1, 2]
 */
async function handleSaveUser(e, alertEl) {
  e.preventDefault();
  const id = $("#userId").value;
  const name = $("#name").value;
  const email = $("#email").value;
  const profile = $("#profile").value;
  const password = $("#password").value;

  try {
    if (id) {
      // Edição (PUT) [2]
      await apiRequest(`/api/users/${id}`, {
        method: "PUT",
        body: { name, email, profile }
      });
      showAlert(alertEl, "ok", "Usuário atualizado com sucesso.");
    } else {
      // Criação (POST) [1]
      await apiRequest("/api/users", {
        method: "POST",
        body: { name, email, password, profile }
      });
      showAlert(alertEl, "ok", "Usuário criado com sucesso.");
    }
    
    e.target.reset();
    $("#userId").value = "";
    await loadUsersFromApi(alertEl);
  } catch (err) {
    handleApiError(err, alertEl);
  }
}

/**
 * Alterna o status (Soft Delete) via API (PATCH) [2]
 */
async function toggleStatus(id, currentStatus) {
  const alertEl = $("#alertUsers");
  const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  try {
    await apiRequest(`/api/users/${id}/status`, {
      method: "PATCH",
      body: { status: newStatus }
    });
    await loadUsersFromApi(alertEl);
  } catch (err) {
    handleApiError(err, alertEl);
  }
}

/**
 * Preenche o formulário para edição
 */
function fillForm(u) {
  $("#userId").value = u.id;
  $("#name").value = u.name;
  $("#email").value = u.email;
  $("#profile").value = u.profile;
  $("#password").placeholder = "Deixe em branco para manter a atual";
}

/**
 * Tratamento de erros padronizado da API [2]
 */
function handleApiError(err, alertEl) {
  // Erro de autenticação ou permissão: redireciona para login [2]
  if (err.status === 401 || err.status === 403) {
    setToken(null);
    localStorage.removeItem("user");
    window.location.href = "./login.html";
    return;
  }

  // Conflito: e-mail duplicado [2]
  if (err.status === 409) {
    return showAlert(alertEl, "err", "Já existe um usuário com este e-mail.");
  }

  showAlert(alertEl, "err", err.message || "Ocorreu um erro na operação.");
}