import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginSchema } from "../validators/auth.validators.js";
import { loginWithLock } from "../services/auth.service.js";
import { requireAuth } from "../middlewares/auth.middlewares.js";
import { forgotPasswordSchema, resetPasswordSchema } from "../validators/password-reset.validators.js";
import { requestPasswordReset, resetPassword } from "../services/password-reset.service.js"

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
});

router.post("/login", loginLimiter, async (req, res, next) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Dados inválidos." });
        }
        const result = await loginWithLock(parsed.data);
        if (!result.ok) {
            return res.status(result.statusCode).json({ message: result.message });
        }
        return res.status(200).json(result.data);
    } catch (err) {
        next(err);
    }
});

router.post("/forgot-password", async (req, res, next) => {
    try {
        const parsed = forgotPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Dados inválidos.",
                details: parsed.error.issues.map(i => ({
                    field: i.path.join("."),
                    message: i.message
                }))
            });
        }
        const result = await requestPasswordReset(parsed.data.email);
        return res.status(result.statusCode).json(result.data);
    } catch (err) {
        next(err);
    }
});

router.post("/reset-password", async (req, res, next) => {
    try {
        const parsed = resetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Dados inválidos.",
                details: parsed.error.issues.map(i => ({
                    field: i.path.join("."),
                    message: i.message
                }))
            });
        }
        const result = await resetPassword(parsed.data.token,
            parsed.data.newPassword);
        if (!result.ok) {
            return res.status(result.statusCode).json({ message: result.message });
        }
        return res.status(result.statusCode).json(result.data);
    } catch (err) {
        next(err);
    }
});

router.get("/me", requireAuth, async (req, res) => {
    return res.json({
        ok: true,
        auth: req.auth
    });
});

export default router;