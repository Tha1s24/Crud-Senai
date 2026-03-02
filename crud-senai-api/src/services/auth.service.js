import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const MAX = Number(process.env.MAX_LOGIN_ATTEMPTS || 3);
const LOCK_MINUTES = Number(process.env.LOCK_MINUTES || 5);

function nowPlusMinutes(min) {
    return new Date(Date.now() + min * 60 * 1000);
}
export async function loginWithLock({ email, password }) {
    const [rows] = await pool.execute(
        `SELECT id, name, email, password_hash, profile, status,
 failed_attempts, locked_until
 FROM users
 WHERE email = ? LIMIT 1`,
        [email]
    );

    const invalidMsg = "Credenciais inválidas.";
    if (rows.length === 0) {
        return { ok: false, statusCode: 401, message: invalidMsg };
    }

    const user = rows[0];
    if (user.status !== "ACTIVE") {
        return { ok: false, statusCode: 403, message: "Usuário inativo." };
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return { ok: false, statusCode: 423, message: "Usuário bloqueado temporariamente." };
    }

    const passOk = await bcrypt.compare(password, user.password_hash);
    if (!passOk) {
        const newFails = Math.min((user.failed_attempts || 0) + 1, 255);
        if (newFails >= MAX) {
            const lockedUntil = nowPlusMinutes(LOCK_MINUTES);
            await pool.execute(
                `UPDATE users,SET failed_attempts = ?, locked_until = ? WHERE id = ?`,
                [newFails, lockedUntil, user.id]
            );
            return { ok: false, statusCode: 423, message: "3 tentativas incorretas. Usuário bloqueado." };
        }

        await pool.execute(
            `UPDATE users SET failed_attempts = ? WHERE id = ?`,
            [newFails, user.id]
        );
        return { ok: false, statusCode: 401, message: invalidMsg };
    }

    if ((user.failed_attempts || 0) > 0 || user.locked_until) {
        await pool.execute(
            `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?`,
            [user.id]
        );
    }

    const token = jwt.sign(
        { sub: String(user.id), profile: user.profile },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );
    
    return {
        ok: true,
        statusCode: 200,
        data: {
            token,
            user: { id: user.id, name: user.name, email: user.email, profile: user.profile }
        }
    };
}