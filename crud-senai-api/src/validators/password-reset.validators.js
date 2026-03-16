import { z } from "zod";
export const forgotPasswordSchema = z.object({
    email: z.string().trim().toLowerCase().email()
});
export const resetPasswordSchema = z.object({
    token: z.string().min(10).max(200),
    newPassword: z.string().min(6).max(100)
})