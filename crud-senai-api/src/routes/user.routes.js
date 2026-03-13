import { apiRequest, setToken } from "./api.js";
import { $, showAlert, hideAlert } from "./utils.js";

// Cache local de usuários
let usersCache = [];

/**
 * Recupera o usuário logado do localStorage
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
  const userInfoEl = $("#loggedUserInfo");
  const logoutBtn = $("#logoutBtn");

  const loggedUser = getLoggedUser();

  // Exibe usuário logado
  if (loggedUser && userInfoEl) {
    userInfoEl.textContent = `Logado como: ${loggedUser.name} (${loggedUser.profile})`;
  }

  // Bloqueia formulário se não for ADMIN
  if (!loggedUser || loggedUser.profile !== "ADMIN") {
    if (form) form.style.display = "none";
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      setToken(null);
      localStorage.removeItem("user");
      window.location.href = "./login.html";
    });
  }

  // Remove alertas ao digitar
  if (form && alertEl) {
    form.addEventListener("input", () => hideAlert(alertEl));
  }

  // Carrega lista inicial
  await loadUsersFromApi(alertEl);

  // Configura envio do formulário
  if (form) {
    form.addEventListener("submit", (e) => handleSaveUser(e, alertEl));
  }
}

/**
 * Busca usuários da API
 */
async function loadUsersFromApi(alertEl) {
  try {
    if (alertEl) hideAlert(alertEl);

    const list = await apiRequest("/api/users");
    usersCache = list;

    render(usersCache);
  } catch (err) {
    handleApiError(err, alertEl);
  }
}

/**
 * Renderiza tabela (seguro contra XSS)
 */
function render(users) {
  const listEl = $("#usersList");
  if (!listEl) return;

  listEl.innerHTML = "";

  const loggedUser = getLoggedUser();

  users.forEach((u) => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = u.name;

    const tdEmail = document.createElement("td");
    tdEmail.textContent = u.email;

    const tdProfile = document.createElement("td");
    tdProfile.textContent = u.profile;

    const tdStatus = document.createElement("td");
    tdStatus.textContent = u.status;

    const tdActions = document.createElement("td");

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
 * Salva ou atualiza usuário
 */
async function handleSaveUser(e, alertEl) {
  e.preventDefault();

  if (alertEl) hideAlert(alertEl);

  const id = $("#userId").value;
  const name = $("#name").value;
  const email = $("#email").value;
  const profile = $("#profile").value;
  const password = $("#password").value;

  try {
    if (id) {
      // Atualização
      await apiRequest(`/api/users/${id}`, {
        method: "PUT",
        body: { name, email, profile }
      });

      showAlert(alertEl, "ok", "Usuário atualizado com sucesso.");
    } else {
      // Criação
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
 * Alterna status do usuário
 */
async function toggleStatus(id, currentStatus) {
  const alertEl = $("#alertUsers");

  if (alertEl) hideAlert(alertEl);

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
 * Preenche formulário para edição
 */
function fillForm(u) {
  $("#userId").value = u.id;
  $("#name").value = u.name;
  $("#email").value = u.email;
  $("#profile").value = u.profile;

  const passwordEl = $("#password");
  passwordEl.value = "";
  passwordEl.placeholder = "Deixe em branco para manter a atual";
}

/**
 * Tratamento de erros da API
 */
function handleApiError(err, alertEl) {

  if (err.status === 401 || err.status === 403) {
    setToken(null);
    localStorage.removeItem("user");
    window.location.href = "./login.html";
    return;
  }

  if (err.status === 409) {
    return showAlert(alertEl, "err", "Já existe um usuário com este e-mail.");
  }

  showAlert(alertEl, "err", err.message || "Ocorreu um erro na operação.");
}