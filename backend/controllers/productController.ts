import { Request, Response } from "express";
import { Product } from "../models/Product";
import { ProductType } from "../types/Product";

export const GetProducts = async (req: Request, res: Response) => {
    try {
        const result = await Product.find();

        if (result.length < 1) {
            return res.status(404).json({
                message: "Brak produktów w bazie danych"
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

export const GetProductById = async (req: Request, res: Response) => {
    try {
        const { id } = await req.body();

        const result = await Product.findOne()
    } catch (e) {
        return res.status(500).json({
            message: "Wystąpił błąd serwera.",
            error: e
        })
    }
}

export const CreateProduct = async (req: Request, res: Response) => {
    try {
        const data = req.body;

        const result = ProductType.safeParse(data);

        if (!result.success) {
            return res.status(400).json({
                message: "Błędne dane produktu podczas tworzenia."
            })
        }

        const product = new Product(result);

        try {
            await product.save()
        } catch (e) {
            return res.status(500).json({
                message: "Błąd podczas zapisywania produktu.",
                error: e
            })
        }

        return res.status(201).json({
            message: "Pomyślnie utworzono produkt",
            product
        })
    } catch (e) {
        return res.status(500).json({
            message: "Wystąpił błąd serwera.",
            error: e
        })
    }
}