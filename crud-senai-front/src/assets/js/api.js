// Define a URL base do servidor backend (Node.js)
// Quando o servidor estiver rodando, as requisições irão para http://localhost:3000
const API_BASE_URL = "http://localhost:3000";

/**
 * Recupera o token JWT armazenado no localStorage
 * O token é usado para autenticar requisições ao backend
 * @returns {string|null} Token de autenticação ou null se não existir
 */
function getToken() {
  return localStorage.getItem("token");
}

/**
 * Função genérica para fazer requisições HTTP autenticadas para o backend
 * 
 * @param {string} path - Caminho da API (ex: "/api/users")
 * @param {object} options - Opções da requisição
 * @param {string} options.method - Método HTTP (GET, POST, PUT, DELETE)
 * @param {object} options.body - Dados para enviar no corpo da requisição
 * @param {boolean} options.auth - Se deve incluir token de autenticação (padrão: true)
 * @returns {Promise<object>} Dados da resposta em JSON
 * @throws {Error} Lança erro se a resposta não for bem-sucedida
 */
export async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  // Cria objeto com headers padrão
  const headers = { "Content-Type": "application/json" };

  // Se a requisição requer autenticação, adiciona o token ao header
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  // Faz a requisição HTTP para o servidor backend
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined  // Converte objeto para string JSON
  });

  // Tenta converter a resposta para JSON, ou retorna vazio se falhar
  const data = await res.json().catch(() => ({}));

  // Se a resposta teve erro (status não está entre 200-299)
  if (!res.ok) {
    // Usa a mensagem do servidor, ou cria uma mensagem padrão com o código HTTP
    const msg = data?.message || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }

  // Retorna os dados da resposta se tudo correu bem
  return data;
}
