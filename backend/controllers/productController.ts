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
        console.log(e);

        return res.status(500).type('application/problem+json').json({
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
            detail: "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.",
            instance: req.originalUrl
        })
    }
}

export const GetProductById = async (req: Request, res: Response) => {
    try {
        const { id } = await req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).type('application/problem+json').json({
                title: "Nieprawidłowy format ID.",
                detail: `ID ${id}, nie jest właściwym formatem identyfikatora zasobu.`,
                status: 400,
                instance: req.originalUrl
            })
        }

        const result = await Product.findById(id).exec();

        if (!result) {
            return res.status(404).type('application/problem+json').json({
                title: "Brak takiego produktu.",
                detail: `Produkt o ID ${id} nie istnieje w bazie danych.`,
                status: 404,
                instance: req.originalUrl
            })
        }

        return res.status(200).json(result);
    } catch (e) {
        console.log(e);

        return res.status(500).type('application/problem+json').json({
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
            detail: "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.",
            instance: req.originalUrl
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

        const product = new Product(result.data);

        try {
            await product.save()
        } catch (e) {
            console.log(e);

            return res.status(500).type('application/problem+json').json({
                type: "about:blank",
                title: "Internal Server Error",
                status: 500,
                detail: "Wystąpił błąd podczas zapisywania produktu.",
                instance: req.originalUrl
            })
        }

        return res.status(201).json({
            message: "Pomyślnie utworzono produkt",
            product
        })
    } catch (e) {
        console.log(e);

        return res.status(500).type('application/problem+json').json({
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
            detail: "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.",
            instance: req.originalUrl
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
        console.log(e);

        return res.status(500).type('application/problem+json').json({
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
            detail: "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.",
            instance: req.originalUrl
        })
    }
}