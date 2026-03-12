// ============================================================
// FUNÇÃO: Usuário Logado
// ============================================================

function getLoggedUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

// Importa a função para fazer requisições à API
import { apiRequest } from "./api.js";
// Importa funções utilitárias (DOM, alertas, validação)
import { $, setText, showAlert, hideAlert, validateEmail } from "./utils.js";

// ============================================================
// FUNÇÕES DE ARMAZENAMENTO (Simulação - banco local)
// ============================================================

function loadUsers() {
  return JSON.parse(localStorage.getItem("demoUsers") || "[]");
}

function saveUsers(users) {
  localStorage.setItem("demoUsers", JSON.stringify(users));
}

// ============================================================
// FUNÇÕES DE RENDERIZAÇÃO (UI)
// ============================================================

function render(users) {
  const tbody = $("#usersTbody");
  tbody.innerHTML = "";

  const loggedUser = getLoggedUser(); // Captura o usuário logado para controle de botões

  users.forEach((u) => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    const tdEmail = document.createElement("td");
    const tdStatus = document.createElement("td");
    const tdActions = document.createElement("td");

    // Proteção contra XSS
    setText(tdName, u.name);
    setText(tdEmail, u.email);

    // Badge de status
    const statusBadge = document.createElement("span");
    statusBadge.className = `badge ${u.active ? "active" : "inactive"}`;
    statusBadge.textContent = u.active ? "ATIVO" : "INATIVO";
    tdStatus.appendChild(statusBadge);

    // ====================================================
    // CONTROLE DE PERMISSÃO (Somente ADMIN pode ver botões)
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
      btnToggle.textContent = u.active ? "Inativar" : "Ativar";
      btnToggle.addEventListener("click", () => toggleStatus(u.id));

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
// FUNÇÕES DE MANIPULAÇÃO DO FORMULÁRIO
// ============================================================

function fillForm(user) {
  $("#userId").value = user.id;
  $("#name").value = user.name;
  $("#email").value = user.email;
  $("#profile").value = user.profile;
  $("#active").value = user.active ? "1" : "0";
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
  $("#password").placeholder = "Senha (será criptografada no backend)";
}

function toggleStatus(id) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return;

  users[idx].active = !users[idx].active;
  saveUsers(users);
  render(users);
}

// ============================================================
// FUNÇÃO PRINCIPAL - Inicializa a página de usuários
// ============================================================

export function initUsersPage() {
  const form = $("#userForm");
  const alertEl = $("#alertUsers");
  const logoutBtn = $("#logoutBtn");
  const searchEl = $("#search");

  hideAlert(alertEl);

  // ============================================================
  // 29.11.4 / 29.11.5 - Controle de acesso e exibição do formulário
  // ============================================================
  const loggedUser = getLoggedUser();
  if (!loggedUser || loggedUser.profile !== "ADMIN") {
    form.style.display = "none"; // Esconde formulário para não-ADMIN
  }

  // ===== CARREGAMENTO INICIAL =====
  const users = loadUsers();
  render(users);

  // ===== HANDLER: Formulário =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const id = $("#userId").value || crypto.randomUUID();
    const name = $("#name").value.trim();
    const email = $("#email").value.trim().toLowerCase();
    const profile = $("#profile").value;
    const active = $("#active").value === "1";
    const password = $("#password").value;

    if (name.length < 3)
      return showAlert(alertEl, "warn", "Nome deve ter pelo menos 3 caracteres.");
    if (!validateEmail(email))
      return showAlert(alertEl, "warn", "E-mail inválido.");

    try {
      const list = loadUsers();

      const exists = list.find((u) => u.email === email && u.id !== id);
      if (exists) throw new Error("Já existe usuário com este e-mail.");

      const idx = list.findIndex((u) => u.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], name, email, profile, active };
      } else {
        list.push({ id, name, email, profile, active });
      }

      saveUsers(list);
      render(list);
      clearForm();
      showAlert(alertEl, "ok", "Usuário salvo com sucesso (simulação).");
    } catch (err) {
      showAlert(alertEl, "err", err.message);
    }
  });

  // ===== BOTÃO LIMPAR =====
  $("#btnClear").addEventListener("click", (e) => {
    e.preventDefault();
    clearForm();
    hideAlert(alertEl);
  });

  // ===== BUSCA =====
  searchEl.addEventListener("input", () => {
    const term = searchEl.value.trim().toLowerCase();
    const list = loadUsers();
    const filtered = list.filter((u) =>
      u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );
    render(filtered);
  });

  // ===== LOGOUT =====
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user"); // 29.11.5 - remove dados do usuário logado
    window.location.href = "./login.html";
  });
}