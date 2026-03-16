import nodemailer from "nodemailer";

/**
 * Validação das variáveis de ambiente obrigatórias
 */
const { MAIL_USER, MAIL_PASS, APP_URL } = process.env;

if (!MAIL_USER || !MAIL_PASS) {
    throw new Error("As variáveis de ambiente MAIL_USER e MAIL_PASS devem estar definidas.");
}

/**
 * Configuração do transporte SMTP
 * Gmail SMTP
 */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS via STARTTLS
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASS
    }
});

/**
 * Envia e-mail com token de redefinição de senha
 * @param {string} email - Email do usuário
 * @param {string} token - Token de redefinição
 * @returns {Promise<void>}
 */
export async function sendPasswordResetEmail(email, token) {
    try {
        const baseUrl = APP_URL || "http://localhost:5500";

        const resetLink = `${baseUrl}/pages/resetpassword.html?token=${token}`;

        const message = {
            from: `"Sistema SENAI" <${MAIL_USER}>`,
            to: email,
            subject: "Redefinição de senha",
            html: `
                <h2>Redefinição de senha</h2>
                <p>Foi solicitada a redefinição da sua senha.</p>

                <p>Use o token abaixo ou clique no link:</p>

                <p style="font-size:18px; font-weight:bold;">
                    ${token}
                </p>

                <p>
                    <a href="${resetLink}" 
                       style="
                        display:inline-block;
                        padding:10px 16px;
                        background:#2563eb;
                        color:#fff;
                        text-decoration:none;
                        border-radius:6px;">
                        Redefinir senha
                    </a>
                </p>

                <p>Este token expira em <b>15 minutos</b>.</p>

                <hr/>

                <small>
                    Caso você não tenha solicitado a redefinição de senha,
                    ignore este e-mail.
                </small>
            `
        };

        await transporter.sendMail(message);

        console.log(`📧 Email de redefinição enviado para ${email}`);
    } catch (error) {
        console.error("Erro ao enviar email de redefinição:", error);
        throw new Error("Falha ao enviar email de redefinição de senha.");
    }
}