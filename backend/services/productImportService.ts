import { parse } from "csv-parse/sync";
import { isObjectIdOrHexString, Types } from "mongoose";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { ImportPayloadType, ImportProductType } from "../types/Product";
import { ApiError, FieldError } from "../utils/ApiError";

type ImportRow = {
    name: string;
    description: string;
    price: number;
    weight: number;
    category: string;
};

const CSV_COLUMNS = ["name", "description", "price", "weight", "category"];

const toNumber = (value: unknown) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
};

export const parseCsv = (content: string): unknown[] => {
    let records: Record<string, string>[];

    try {
        records = parse(content, {
            columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
            skip_empty_lines: true,
            trim: true,
            bom: true,
        });
    } catch (err) {
        throw ApiError.badRequest(`Niepoprawny format pliku CSV: ${(err as Error).message}`);
    }

    if (records.length > 0) {
        const missing = CSV_COLUMNS.filter((c) => !(c in records[0]));
        if (missing.length) {
            throw ApiError.unprocessable(
                "Plik CSV nie zawiera wymaganych kolumn.",
                missing.map((field) => ({ field, message: "Brak kolumny w nagłówku pliku." }))
            );
        }
    }

    return records.map((r) => ({ ...r, price: toNumber(r.price), weight: toNumber(r.weight) }));
};

export const parseJson = (body: unknown): unknown[] => {
    if (Array.isArray(body)) return body;
    if (body && typeof body === "object" && Array.isArray((body as { products?: unknown }).products)) {
        return (body as { products: unknown[] }).products;
    }
    throw ApiError.unprocessable(
        "Dane JSON muszą być tablicą produktów lub obiektem z polem products.",
        [{ field: "products", message: "Oczekiwano tablicy produktów." }]
    );
};

const validateRows = (items: unknown[]) => {
    const payload = ImportPayloadType.safeParse(items);
    if (!payload.success) {
        throw ApiError.fromZod(payload.error, "Niepoprawne dane do inicjalizacji.");
    }

    const errors: FieldError[] = [];
    const rows: ImportRow[] = [];

    items.forEach((item, index) => {
        const result = ImportProductType.safeParse(item);
        if (!result.success) {
            for (const issue of result.error.issues) {
                errors.push({ field: `[${index}].${issue.path.map(String).join(".")}`, message: issue.message });
            }
        } else {
            rows.push(result.data);
        }
    });

    if (errors.length) {
        throw ApiError.unprocessable("Dane co najmniej jednego produktu są niepoprawne. Nie dodano żadnego produktu.", errors);
    }

    return rows;
};

const findDuplicates = (rows: ImportRow[]) => {
    const seen = new Map<string, number>();
    const errors: FieldError[] = [];

    rows.forEach((row, index) => {
        const key = row.name.toLocaleLowerCase("pl");
        const first = seen.get(key);
        if (first !== undefined) {
            errors.push({
                field: `[${index}].name`,
                message: `Produkt "${row.name}" występuje w pliku więcej niż raz (pierwsze wystąpienie: [${first}]).`,
            });
        } else {
            seen.set(key, index);
        }
    });

    if (errors.length) {
        throw ApiError.unprocessable("Plik zawiera zduplikowane produkty. Nie dodano żadnego produktu.", errors);
    }
};

const resolveCategories = async (rows: ImportRow[]) => {
    const values = [...new Set(rows.map((r) => r.category))];
    const ids = values.filter((v) => isObjectIdOrHexString(v));

    const categories = await Category.find({ $or: [{ _id: { $in: ids } }, { name: { $in: values } }] });

    const lookup = new Map<string, Types.ObjectId>();
    for (const c of categories) {
        lookup.set(c.id, c._id as Types.ObjectId);
        lookup.set(c.name, c._id as Types.ObjectId);
    }

    const errors: FieldError[] = [];
    rows.forEach((row, index) => {
        if (!lookup.has(row.category)) {
            errors.push({ field: `[${index}].category`, message: `Kategoria "${row.category}" nie istnieje w bazie danych.` });
        }
    });

    if (errors.length) {
        throw ApiError.unprocessable("Plik odwołuje się do nieistniejących kategorii. Nie dodano żadnego produktu.", errors);
    }

    return lookup;
};

export const importProducts = async (items: unknown[]) => {
    if (await Product.exists({})) {
        throw ApiError.conflict(
            "Baza danych zawiera już produkty. Inicjalizacja jest możliwa tylko dla pustej bazy.",
            "/problems/already-initialized"
        );
    }

    const rows = validateRows(items);
    findDuplicates(rows);
    const categories = await resolveCategories(rows);

    const docs = rows.map((row) => ({
        _id: new Types.ObjectId(),
        ...row,
        category: categories.get(row.category)!,
    }));

    try {
        await Product.insertMany(docs, { ordered: true });
    } catch (err) {
        await Product.deleteMany({ _id: { $in: docs.map((d) => d._id) } });

        if ((err as { code?: number }).code === 11000) {
            throw ApiError.conflict(
                "Podczas inicjalizacji wystąpił konflikt z istniejącymi produktami. Nie dodano żadnego produktu.",
                "/problems/already-initialized"
            );
        }
        throw err;
    }

    return docs.length;
};
