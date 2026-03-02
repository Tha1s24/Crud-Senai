import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginSchema } from "../validators/auth.validators.js";
import { loginWithLock } from "../services/auth.service.js";

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

export default router;