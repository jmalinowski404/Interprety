import { Request, Response } from "express";
import { Product } from "../models/Product";
import { ProductType, ProductUpdateType } from "../types/Product";

import { isValidObjectId } from "mongoose";
import { ensureCategoryExists } from "../services/categoryService";
import { ApiError } from "../utils/ApiError";

import OpenAI from "openai";
import { SYSTEM_PROMPT } from "../utils/Prompt";
import { Category } from "../models/Category";

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

export const CreateSEODescription = async (req: Request, res: Response) => {
  const { id } = req.params;

  const client = new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
  })
  const product = await Product.findById(id);

  if (!product) {
    throw ApiError.notFound(`Produkt o ID ${id} nie istnieje w bazie danych.`);
  }

  const productData = {
    name: product.name,
    description: product.description,
    price: product.price,
    weight: product.weight,
    category: Category.findById(product.category?._id),
  };

  let text: string;
  try {
    const message = await client.responses.create({
      model: "openai/gpt-oss-20b",
      instructions: SYSTEM_PROMPT,
      input: `Dane produktu (JSON):\n${JSON.stringify(productData)}`,
    });
    text = message.output_text;
  } catch (err) {
    console.error("Błąd API modelu:", err);
    throw new ApiError({ status: 502, title: "Błąd usługi zewnętrznej.", detail: "Nie udało się połączyć z modelem językowym.", type: "/problems/bad-gateway" });
  }

  let html: unknown;
  try {
    html = JSON.parse(text).html;
  } catch {
    html = undefined;
  }

  if (typeof html !== "string" || html.trim() === "") {
    throw new ApiError({ status: 502, title: "Błąd usługi zewnętrznej.", detail: "Model zwrócił odpowiedź w niepoprawnym formacie.", type: "/problems/bad-gateway" });
  }

  return res.status(200).json({ id, text })
}