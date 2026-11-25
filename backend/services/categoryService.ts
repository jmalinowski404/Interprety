import { Category } from "../models/Category";
import { ApiError } from "../utils/ApiError";

export const ensureCategoryExists = async (categoryId: string) => {
    const exists = await Category.exists({ _id: categoryId });

    if (!exists) {
        throw ApiError.unprocessable(
            `Kategoria o ID ${categoryId} nie istnieje w bazie danych.`,
            [{ field: "category", message: "Kategoria nie istnieje." }]
        );
    }
};
