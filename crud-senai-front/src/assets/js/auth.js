// Importa a função para fazer requisições à API
import { apiRequest } from "./api.js";
// Importa funções utilitárias (DOM, alertas, validação)
import { $, showAlert, hideAlert, validateEmail } from "./utils.js";

// Define o número máximo de tentativas de login antes de bloquear a conta
const MAX_TRIES = 3;

/**
 * Recupera o estado de tentativas de login de um usuário do localStorage
 * Armazena: quantidade de tentativas e até quando a conta está bloqueada
 * 
 * @param {string} email - Email do usuário
 * @returns {object} Objeto com { count: número de tentativas, lockedUntil: timestamp }
 */
function getTryState(email) {
  // Tenta buscar o estado guardado, ou cria um novo se não existir
  const raw = localStorage.getItem(`tries:${email}`);
  return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
}

/**
 * Salva o estado de tentativas no localStorage
 * 
 * @param {string} email - Email do usuário
 * @param {object} state - Estado com count e lockedUntil
 */
function setTryState(email, state) {
  localStorage.setItem(`tries:${email}`, JSON.stringify(state));
}

/**
 * Verifica se a conta está bloqueada por tempo limite
 * 
 * @param {object} state - Estado com informação de bloqueio
 * @returns {boolean} true se ainda está bloqueado, false se pode tentar novamente
 */
function isLocked(state) {
  return Date.now() < (state.lockedUntil || 0);
}

/**
 * Bloqueia a conta por 5 minutos após máximo de tentativas
 * 
 * @param {object} state - Estado a ser modificado
 * @returns {object} Estado atualizado com novo tempo de bloqueio
 */
function lockFor5Minutes(state) {
  state.lockedUntil = Date.now() + 5 * 60 * 1000;  // 5 minutos em milissegundos
  return state;
}

/**
 * Inicializa a página de login
 * Configura listeners de evento para formulário de login e botão "Esqueci senha"
 */
export function initLoginPage() {
  // Captura os elementos HTML do formulário
  const form = $("#loginForm");
  const emailEl = $("#email");
  const passEl = $("#password");
  const alertEl = $("#alert");
  const forgotBtn = $("#forgotBtn");

  // Esconde qualquer mensagem de alerta que possa estar visível
  hideAlert(alertEl);

  // Configura o handler para quando o formulário é submetido
  form.addEventListener("submit", async (e) => {
    e.preventDefault();  // Previne o comportamento padrão de reload da página
    hideAlert(alertEl);  // Limpa alertas anteriores

    // Captura e normaliza os valores do formulário
    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value;

    // Valida se o email tem formato correto
    if (!validateEmail(email)) {
      return showAlert(alertEl, "warn", "Informe um e-mail válido.");
    }

    // Recupera o estado de tentativas deste email
    let state = getTryState(email);

    // Se a conta está bloqueada, calcula quanto tempo falta para desbloquear
    if (isLocked(state)) {
      const mins = Math.ceil((state.lockedUntil - Date.now()) / 60000);
      return showAlert(alertEl, "err", `Usuário bloqueado temporariamente. Tente novamente em ~${mins} min.`);
    }

    try {
      // IMPORTANTE: Quando o backend estiver pronto, descomente a linha abaixo:
      // const data = await apiRequest("/api/auth/login", { method: "POST", body: { email, password }, auth: false });

      // Para fins educacionais, simulamos o login localmente
      // A senha correta é "123456" para demonstração
      if (password !== "123456") throw new Error("Credenciais inválidas (simulação). Use senha 123456.");

      // Simula a geração de um token (o real virá do backend)
      const fakeToken = "FAKE_TOKEN_DEMO";
      localStorage.setItem("token", fakeToken);
      localStorage.setItem("userEmail", email);

      // Reseta o contador de tentativas após login bem-sucedido
      state = { count: 0, lockedUntil: 0 };
      setTryState(email, state);

      // Mostra mensagem de sucesso e redireciona para a página de usuários
      showAlert(alertEl, "ok", "Login realizado! Redirecionando…");
      setTimeout(() => (window.location.href = "./users.html"), 700);
    } catch (err) {
      // Incrementa o contador de tentativas após erro
      state.count += 1;

      // Se atingiu o máximo de tentativas, bloqueia a conta por 5 minutos
      if (state.count >= MAX_TRIES) {
        state = lockFor5Minutes(state);
        setTryState(email, state);
        return showAlert(alertEl, "err", "3 tentativas incorretas. Usuário bloqueado por 5 minutos (simulação).");
      }

      // Salva o novo estado e mostra mensagem de erro com tentativas restantes
      setTryState(email, state);
      showAlert(alertEl, "err", `${err.message} Tentativas: ${state.count}/${MAX_TRIES}`);
    }
  });

  // Configura handler para o botão "Esqueci a senha"
  forgotBtn.addEventListener("click", async () => {
    hideAlert(alertEl);
    const email = emailEl.value.trim().toLowerCase();

    // Valida o email antes de enviar
    if (!validateEmail(email)) {
      return showAlert(alertEl, "warn", "Para redefinir, informe um e-mail válido no campo e-mail.");
    }

    try {
      // IMPORTANTE: Quando o backend estiver pronto, descomente:
      // await apiRequest("/api/auth/forgot-password", { method: "POST", body: { email }, auth: false });

      // Para aula, apenas simula o comportamento
      showAlert(alertEl, "ok", "Se este e-mail existir, enviaremos um link/código de redefinição (simulação).");
    } catch (err) {
      showAlert(alertEl, "err", err.message);
    }
  });
}
