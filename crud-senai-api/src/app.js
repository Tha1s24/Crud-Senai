import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";

export const app = express();

app.use(helmet());
app.use(express.json({ limit: "50kb" }));
app.use(cors({
    origin: true,
    credentials: false
}));

app.use(rateLimit({
    windowMs: 60 * 1000,
    limit: 300
}));

app.use("/api/auth", authRoutes);
app.get("/health", (req, res) => res.json({ ok: true }));
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Erro interno." });
});
