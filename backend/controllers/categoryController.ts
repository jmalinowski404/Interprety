import { Request, Response } from "express";
import { Category } from "../models/Category";

export const GetCategories = async (req: Request, res: Response) => {
    try {
        const result = await Category.find();
        
        if(result.length < 1) {
            return res.status(404).json({
                message: "Brak kategorii w bazie danych"
            })
        }

        return res.status(200).json(result);
    } catch (e) {
        return res.status(500).json({
            message: "Wystąpił błąd serwera.",
            error: e
        })
    }
}