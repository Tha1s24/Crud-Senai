import jwt from "jsonwebtoken";

export function requireAuth(req, res, next){
    try {
        const auth =req.headers.authorization;

        if (!auth || !auth.startsWith("Bearer")){
            return res.status(401).json({message: "Token ausente."});
        }

        const token = auth.substring("Bearer".length).trim();
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        req.auth = {
            userId: payload.sub,
            profile: payload.profile
        };
        next();
    } catch (err) {
        return res.status(401).json({message: "Token inválido ou expirado."})
    }
}