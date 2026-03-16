import crypto from "crypto";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { sendPasswordResetEmail } from "./mail.service.js";

/**
 * Gera um token aleatório e retorna:
 * - token em texto puro (para envio por e-mail ou teste)
 * - hash do token (para salvar no banco)
 */
function generateResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const token_hash = crypto.createHash("sha256").update(token).digest("hex");

  return { token, token_hash };
}

/**
 * Solicita redefinição de senha.
 * Se o e-mail existir, cria token temporário com expiração.
 */
export async function requestPasswordReset(email) {

  const [users] = await pool.execute(
    `SELECT id, email FROM users WHERE email = ? LIMIT 1`,
    [email]
  );

  // Sempre retorna resposta neutra por segurança
  if (!users.length) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        message:
          "Se este e-mail existir, você receberá um e-mail com instruções para redefinir a senha."
      }
    };
  }

  const user = users[0];

  const { token, token_hash } = generateResetToken();

  // Expiração: 15 minutos
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.execute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [user.id, token_hash, expiresAt]
  );

  // Envia e-mail com o token
  await sendPasswordResetEmail(user.email, token);

  return {
    ok: true,
    statusCode: 200,
    data: {
      message:
        "Se este e-mail existir, um token de redefinição foi gerado.",
      token // exibido apenas para ambiente didático/testes
    }
  };
}

/**
 * Redefine a senha usando token temporário.
 */
export async function resetPassword(token, newPassword) {

  const token_hash = crypto.createHash("sha256").update(token).digest("hex");

  const [rows] = await pool.execute(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at
     FROM password_reset_tokens prt
     WHERE prt.token_hash = ?
     ORDER BY prt.id DESC
     LIMIT 1`,
    [token_hash]
  );

  if (!rows.length) {
    return {
      ok: false,
      statusCode: 400,
      message: "Token inválido."
    };
  }

  const resetRow = rows[0];

  if (resetRow.used_at) {
    return {
      ok: false,
      statusCode: 400,
      message: "Token já utilizado."
    };
  }

  if (new Date(resetRow.expires_at) < new Date()) {
    return {
      ok: false,
      statusCode: 400,
      message: "Token expirado."
    };
  }

  const password_hash = await bcrypt.hash(newPassword, 10);

  await pool.execute(
    `UPDATE users
     SET password_hash = ?, failed_attempts = 0, locked_until = NULL
     WHERE id = ?`,
    [password_hash, resetRow.user_id]
  );

  await pool.execute(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE id = ?`,
    [resetRow.id]
  );

  return {
    ok: true,
    statusCode: 200,
    data: {
      message: "Senha redefinida com sucesso."
    }
  };
}