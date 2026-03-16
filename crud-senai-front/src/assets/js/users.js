// ============================================================
// 29.11.2 - FUNÇÃO: Usuário Logado
// ============================================================

function getLoggedUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

// ============================================================
// IMPORTS
// ============================================================

import { apiRequest } from "./api.js";
import { $, setText, showAlert, hideAlert, validateEmail } from "./utils.js";

// ============================================================
// CACHE LOCAL
// ============================================================

let usersCache = [];

// ============================================================
// 29.10.7 - CARREGAR USUÁRIOS DA API
// ============================================================

async function loadUsersFromApi(alertEl) {
  try {
    const list = await apiRequest("/api/users");
    usersCache = list;
    render(usersCache);
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      setToken(null);
      window.location.href = "./login.html";
      return;
    }

    showAlert(alertEl, "err", "Erro ao carregar usuários.");
  }
}

// ============================================================
// 29.10.8 - RENDERIZAÇÃO SEGURA (ANTI-XSS)
// ============================================================

function render(users) {
  const tbody = $("#usersTbody");
  tbody.innerHTML = "";

  const loggedUser = getLoggedUser();

  users.forEach((u) => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    const tdEmail = document.createElement("td");
    const tdStatus = document.createElement("td");
    const tdActions = document.createElement("td");

    tdName.textContent = u.name;
    tdEmail.textContent = u.email;

    const statusBadge = document.createElement("span");
    statusBadge.className =
      "badge " + (u.status === "ACTIVE" ? "active" : "inactive");

    statusBadge.textContent = u.status === "ACTIVE" ? "ATIVO" : "INATIVO";

    tdStatus.appendChild(statusBadge);

    // ====================================================
    // 29.11.3 - BOTÕES APENAS PARA ADMIN
    // ====================================================

    if (loggedUser && loggedUser.profile === "ADMIN") {
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn-ghost";
      btnEdit.type = "button";
      btnEdit.textContent = "Editar";
      btnEdit.addEventListener("click", () => fillForm(u));

      const btnToggle = document.createElement("button");
      btnToggle.className = "btn-danger";
      btnToggle.type = "button";
      btnToggle.textContent =
        u.status === "ACTIVE" ? "Inativar" : "Ativar";

      btnToggle.addEventListener("click", () =>
        toggleStatus(u.id, u.status, $("#alertUsers"))
      );

      tdActions.appendChild(btnEdit);
      tdActions.appendChild(btnToggle);
    }

    tr.appendChild(tdName);
    tr.appendChild(tdEmail);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

// ============================================================
// FORMULÁRIO
// ============================================================

function fillForm(user) {
  $("#userId").value = user.id;
  $("#name").value = user.name;
  $("#email").value = user.email;
  $("#profile").value = user.profile;
  $("#active").value = user.status === "ACTIVE" ? "1" : "0";

  $("#password").value = "";
  $("#password").placeholder = "Deixe em branco para manter a senha";
}

function clearForm() {
  $("#userId").value = "";
  $("#name").value = "";
  $("#email").value = "";
  $("#profile").value = "USER";
  $("#active").value = "1";

  $("#password").value = "";
  $("#password").placeholder =
    "Senha (será criptografada no backend)";
}

// ============================================================
// 29.10.11 - SOFT DELETE (INATIVAR)
// ============================================================

async function toggleStatus(id, currentStatus, alertEl) {
  try {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    await apiRequest(`/api/users/${id}/status`, {
      method: "PATCH",
      body: { status: newStatus }
    });

    await loadUsersFromApi(alertEl);
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      setToken(null);
      window.location.href = "./login.html";
      return;
    }

    showAlert(alertEl, "err", "Erro ao alterar status do usuário.");
  }
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

export function initUsersPage() {
  const form = $("#userForm");
  const alertEl = $("#alertUsers");
  const logoutBtn = $("#logoutBtn");
  const searchEl = $("#search");

  hideAlert(alertEl);

  // ============================================================
  // 29.11.4 - BLOQUEAR FORMULÁRIO PARA NÃO ADMIN
  // ============================================================

  const loggedUser = getLoggedUser();

  if (!loggedUser || loggedUser.profile !== "ADMIN") {
    form.style.display = "none";
  }

  // ============================================================
  // CARREGAMENTO INICIAL
  // ============================================================

  loadUsersFromApi(alertEl);

  // ============================================================
  // SUBMIT FORM
  // ============================================================

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const id = $("#userId").value;

    const name = $("#name").value.trim();
    const email = $("#email").value.trim().toLowerCase();
    const profile = $("#profile").value;
    const status = $("#active").value === "1" ? "ACTIVE" : "INACTIVE";
    const password = $("#password").value;

    if (name.length < 3)
      return showAlert(alertEl, "warn", "Nome deve ter pelo menos 3 caracteres.");

    if (!validateEmail(email))
      return showAlert(alertEl, "warn", "E-mail inválido.");

    try {

      // ========================================================
      // 29.10.9 - CRIAR USUÁRIO
      // ========================================================

      if (!id) {
        await apiRequest("/api/users", {
          method: "POST",
          body: { name, email, password, profile }
        });
      }

      // ========================================================
      // 29.10.10 - EDITAR USUÁRIO
      // ========================================================

      else {
        await apiRequest(`/api/users/${id}`, {
          method: "PUT",
          body: { name, email, profile, status }
        });
      }

      await loadUsersFromApi(alertEl);

      clearForm();

      showAlert(alertEl, "ok", "Usuário salvo com sucesso.");
    } catch (err) {

      // ========================================================
      // 29.10.12 - TRATAMENTO DE ERROS
      // ========================================================

      if (err.status === 401 || err.status === 403) {
        setToken(null);
        window.location.href = "./login.html";
        return;
      }

      if (err.status === 409) {
        showAlert(alertEl, "err", "Já existe usuário com este e-mail.");
        return;
      }

      showAlert(alertEl, "err", "Erro ao salvar usuário.");
    }
  });

  // ============================================================
  // BOTÃO LIMPAR
  // ============================================================

  $("#btnClear").addEventListener("click", (e) => {
    e.preventDefault();
    clearForm();
    hideAlert(alertEl);
  });

  // ============================================================
  // BUSCA LOCAL (CACHE)
  // ============================================================

  searchEl.addEventListener("input", () => {
    const term = searchEl.value.trim().toLowerCase();

    const filtered = usersCache.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
    );

    render(filtered);
  });

  // ============================================================
  // 29.11.5 - LOGOUT SEGURO
  // ============================================================

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "./login.html";
  });
}