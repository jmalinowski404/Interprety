import z from "zod";

export const LoginType = z.object({
    login: z.string().trim().min(1, "Login jest wymagany."),
    password: z.string().min(1, "Hasło jest wymagane."),
});
