import { Request, Response } from "express";
import { Product } from "../models/Product";
import { ProductType } from "../types/Product";

import { isValidObjectId } from "mongoose";
import { Category } from "../models/Category";
import { ApiError } from "../utils/ApiError";

export const GetProducts = async (req: Request, res: Response) => {
  const result = await Product.find();

  if (result.length < 1) {
    throw ApiError.notFound("Brak produktów w bazie danych.");
  }

  return res.status(200).json(result);
};

export const GetProductById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw ApiError.badRequest(
      `ID ${id}, nie jest właściwym formatem identyfikatora zasobu.`
    );
  }

  const result = await Product.findById(id).exec();

  if (!result) {
    throw ApiError.notFound(`Produkt o ID ${id} nie istnieje w bazie danych.`);
  }

  return res.status(200).json(result);
};

export const CreateProduct = async (req: Request, res: Response) => {
  const result = ProductType.safeParse(req.body);

  if (!result.success) {
    throw ApiError.fromZod(
      result.error,
      "Błędne dane produktu podczas tworzenia."
    );
  }

  if (result.data.price <= 0.0) {
    throw ApiError.unprocessable(
      "Cena produktu nie może być mniejsza lub równa 0"
    );
  }

  if (result.data.weight <= 0.0) {
    throw ApiError.unprocessable(
      "Waga produktu nie może być mniejsza lub równa 0"
    );
  }

  const categoryExists = await Category.exists({
    _id: result.data.category,
  });

  if (categoryExists === null) {
    throw ApiError.unprocessable(
      `Kategoria o ID ${result.data.category} nie istnieje w bazie danych.`
    );
  }

  const product = new Product(result.data);

  await product.save();

  return res.status(201).json({
    message: "Pomyślnie utworzono produkt",
    product,
  });
};

export const UpdateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw ApiError.badRequest(
      `ID ${id}, nie jest właściwym formatem identyfikatora zasobu.`
    );
  }

  const result = ProductType.partial().safeParse(req.body);

  if (!result.success) {
    throw ApiError.fromZod(
      result.error,
      "Błędne dane produktu podczas aktualizacji."
    );
  }

  if (result.data.price !== undefined && result.data.price <= 0.0) {
    throw ApiError.unprocessable(
      "Cena produktu nie może być mniejsza lub równa 0"
    );
  }

  if (result.data.weight !== undefined && result.data.weight <= 0.0) {
    throw ApiError.unprocessable(
      "Waga produktu nie może być mniejsza lub równa 0"
    );
  }

  if (result.data.category !== undefined) {
    const categoryExists = await Category.exists({
      _id: result.data.category,
    });

    if (categoryExists === null) {
      throw ApiError.unprocessable(
        `Kategoria o ID ${result.data.category} nie istnieje w bazie danych.`
      );
    }
  }

  const product = await Product.findByIdAndUpdate(id, result.data, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw ApiError.notFound(`Produkt o ID ${id} nie istnieje w bazie danych.`);
  }

  return res.status(200).json({
    message: "Pomyślnie zaktualizowano produkt",
    product,
  });
};
