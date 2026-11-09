import { Request, Response } from "express";

export const GetProducts = async (req: Request, res: Response) => {
    try {

    } catch (e) {
        return res.status(500).json({
            message: "Wystąpił błąd serwera.",
            error: e
        })
    }
}