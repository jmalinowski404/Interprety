import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import type { IRole } from "../models/Role";
import { LoginType } from "../types/Auth";
import { ApiError } from "../utils/ApiError";
import { signToken, TOKEN_TTL_SECONDS } from "../utils/jwt";

const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

export const Login = async (req: Request, res: Response) => {
    const result = LoginType.safeParse(req.body);

    if (!result.success) {
        throw ApiError.fromZod(result.error, "Błędne dane logowania.");
    }

    const { login, password } = result.data;

    const user = await User.findOne({ login })
        .select("+passwordHash")
        .populate<{ role: IRole }>("role");

    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !valid) {
        throw ApiError.unauthorized("Niepoprawny login lub hasło.");
    }

    const token = signToken({ sub: user.id, login: user.login, role: user.role.name });

    return res.status(200).json({
        accessToken: token,
        tokenType: "Bearer",
        expiresIn: TOKEN_TTL_SECONDS,
        user: { id: user.id, login: user.login, role: user.role.name },
    });
};
