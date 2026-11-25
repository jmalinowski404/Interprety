import { Request, Response } from "express";
import { Category } from "../models/Category";
import { ApiError } from "../utils/ApiError";

export const GetCategories = async (req: Request, res: Response) => {
    const result = await Category.find();

    return res.status(200).json(result);
}
