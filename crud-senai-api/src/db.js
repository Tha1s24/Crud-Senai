import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const required = ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"];
for (const k of required) {
    if (!process.env[k]) {
        throw new Error(`Variável de ambiente faltando: ${k}. Verifique o arquivo .env
na raiz do projeto.`);
    }
}

export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});