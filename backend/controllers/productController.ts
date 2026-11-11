import { Request, Response } from "express";
import { Product } from "../models/Product";
import { ProductType } from "../types/Product";

import { isValidObjectId } from "mongoose";

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

export const UpdateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(404).json({
                message: "Nie znaleziono produktu o podanym identyfikatorze."
            })
        }

        const result = ProductType.partial().safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Błędne dane produktu podczas aktualizacji."
            })
        }

        const product = await Product.findByIdAndUpdate(id, result.data, {
            new: true,
            runValidators: true
        });

        if (!product) {
            return res.status(404).json({
                message: "Nie znaleziono produktu o podanym identyfikatorze."
            })
        }

        return res.status(200).json({
            message: "Pomyślnie zaktualizowano produkt",
            product
        })
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            message: "Wystąpił błąd serwera.",
            error: e
        })
    }
}