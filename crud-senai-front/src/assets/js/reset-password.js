import { apiRequest } from "./api.js";
import { $, showAlert, hideAlert } from "./utils.js";

export function initResetPasswordPage() {
    const form = $("#resetPasswordForm");
    const tokenEl = $("#token");
    const newPasswordEl = $("#newPassword");
    const alertEl = $("#alertReset");

    hideAlert(alertEl);

    // 🔹 Novo: Pré-preencher token vindo da URL
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    if (tokenFromUrl) {
        tokenEl.value = tokenFromUrl;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert(alertEl);

        const token = tokenEl.value.trim();
        const newPassword = newPasswordEl.value;

        if (!token || token.length < 10) {
            return showAlert(alertEl, "warn", "Informe um token válido.");
        }

        if (!newPassword || newPassword.length < 6) {
            return showAlert(alertEl, "warn", "A nova senha deve ter pelo menos 6 caracteres.");
        }

        try {
            const data = await apiRequest("/api/auth/reset-password", {
                method: "POST",
                body: { token, newPassword },
                auth: false
            });

            showAlert(alertEl, "ok", data.message || "Senha redefinida com sucesso.");

            // Limpa o formulário após sucesso
            tokenEl.value = "";
            newPasswordEl.value = "";

            // Redireciona para login após breve pausa
            setTimeout(() => {
                window.location.href = "./login.html";
            }, 1500);

        } catch (err) {
            console.log("DEBUG ERRO RESET PASSWORD:", err.message, err.status, err.data);

            if (err.status === 400) {
                return showAlert(alertEl, "err", err.message || "Dados inválidos.");
            }

            showAlert(alertEl, "err", err.message || "Falha ao redefinir a senha.");
        }
    });
}