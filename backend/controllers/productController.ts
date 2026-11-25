import { Request, Response } from "express";
import { Product } from "../models/Product";
import { ProductType, ProductUpdateType } from "../types/Product";

import { isValidObjectId } from "mongoose";
import { ensureCategoryExists } from "../services/categoryService";
import { ApiError } from "../utils/ApiError";

export const GetProducts = async (req: Request, res: Response) => {
  const result = await Product.find();

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

  await ensureCategoryExists(result.data.category);

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

  const result = ProductUpdateType.safeParse(req.body);

  if (!result.success) {
    throw ApiError.fromZod(
      result.error,
      "Błędne dane produktu podczas aktualizacji."
    );
  }

  if (result.data.category !== undefined) {
    await ensureCategoryExists(result.data.category);
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
