import jwt from "jsonwebtoken";
import type { RoleName } from "../models/Role";

export type TokenPayload = {
    sub: string;
    login: string;
    role: RoleName;
};

const getSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("Brak zmiennej środowiskowej JWT_SECRET.");
    }
    return secret;
};

export const TOKEN_TTL_SECONDS = 60 * 60;

export const signToken = (payload: TokenPayload) =>
    jwt.sign({ login: payload.login, role: payload.role }, getSecret(), {
        subject: payload.sub,
        expiresIn: TOKEN_TTL_SECONDS,
        algorithm: "HS256",
    });

export const verifyToken = (token: string): TokenPayload => {
    const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] }) as jwt.JwtPayload;
    return { sub: decoded.sub!, login: decoded.login, role: decoded.role };
};
