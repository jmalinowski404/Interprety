import { Request, Response } from "express";
import { Product } from "../models/Product";
import { ProductType } from "../types/Product";

import { isValidObjectId } from "mongoose";

export const GetProducts = async (req: Request, res: Response) => {
    try {
        const result = await Product.find();

        if (result.length < 1) {
            return res.status(404).type('application/problem+json').json({
                type: "about:blank",
                title: "Brak produktów.",
                status: 404,
                detail: "Brak produktów w bazie danych.",
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

export const GetProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).type('application/problem+json').json({
                type: "about:blank",
                title: "Nieprawidłowy format ID.",
                status: 400,
                detail: `ID ${id}, nie jest właściwym formatem identyfikatora zasobu.`,
                instance: req.originalUrl
            })
        }

        const result = await Product.findById(id).exec();

        if (!result) {
            return res.status(404).type('application/problem+json').json({
                type: "about:blank",
                title: "Brak takiego produktu.",
                status: 404,
                detail: `Produkt o ID ${id} nie istnieje w bazie danych.`,
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
            return res.status(422).type('application/problem+json').json({
                type: "about:blank",
                title: "Błędne dane produktu.",
                status: 422,
                detail: "Błędne dane produktu podczas tworzenia.",
                instance: req.originalUrl
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
            return res.status(400).type('application/problem+json').json({
                type: "about:blank",
                title: "Nieprawidłowy format ID.",
                status: 400,
                detail: `ID ${id}, nie jest właściwym formatem identyfikatora zasobu.`,
                instance: req.originalUrl
            })
        }

        const result = ProductType.partial().safeParse(req.body);

        if (!result.success) {
            return res.status(422).type('application/problem+json').json({
                type: "about:blank",
                title: "Błędne dane produktu.",
                status: 422,
                detail: "Błędne dane produktu podczas aktualizacji.",
                instance: req.originalUrl
            })
        }

        const product = await Product.findByIdAndUpdate(id, result.data, {
            new: true,
            runValidators: true
        });

        if (!product) {
            return res.status(404).type('application/problem+json').json({
                type: "about:blank",
                title: "Brak takiego produktu.",
                status: 404,
                detail: `Produkt o ID ${id} nie istnieje w bazie danych.`,
                instance: req.originalUrl
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
