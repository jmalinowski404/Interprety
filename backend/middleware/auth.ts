import { NextFunction, Request, Response } from "express";
import type { RoleName } from "../models/Role";
import { ApiError } from "../utils/ApiError";
import { TokenPayload, verifyToken } from "../utils/jwt";

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header) {
        res.setHeader("WWW-Authenticate", "Bearer");
        throw ApiError.unauthorized("Brak nagłówka Authorization.");
    }

    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        res.setHeader("WWW-Authenticate", "Bearer");
        throw ApiError.unauthorized("Nagłówek Authorization musi mieć postać: Bearer {token}.");
    }

    try {
        req.user = verifyToken(token);
    } catch {
        res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"');
        throw ApiError.unauthorized("Token jest niepoprawny lub wygasł.");
    }

    next();
};

export const authorize = (...roles: RoleName[]) =>
    (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            throw ApiError.unauthorized();
        }

        if (!roles.includes(req.user.role)) {
            throw ApiError.forbidden(`Operacja wymaga roli: ${roles.join(" lub ")}.`);
        }

        next();
    };
