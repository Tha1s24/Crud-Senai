// URL base do backend (Node.js)
const API_BASE_URL = "http://localhost:3000";

// Recupera o token armazenado no navegador
function getToken() {
  return localStorage.getItem("token");
}

// Salva ou remove o token do localStorage
export function setToken(token) {
  if (!token) {
    localStorage.removeItem("token");
    return;
  }
  localStorage.setItem("token", token);
}

/**
 * Função genérica para chamadas HTTP à API
 * @param {string} path - Caminho da API (ex: /api/auth/me)
 * @param {object} options - Opções da requisição
 */
export async function apiRequest(
  path,
  { method = "GET", body, auth = true } = {}
) {
  const headers = {
    "Content-Type": "application/json"
  };

  // Inclui token automaticamente quando auth = true
  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  // Tratamento padronizado de erro
  if (!response.ok) {
    const error = new Error(data.message || `Erro HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}