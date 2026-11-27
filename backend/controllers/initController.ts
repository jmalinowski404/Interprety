import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { importProducts, parseCsv, parseJson } from "../services/productImportService";

export const InitProducts = async (req: Request, res: Response) => {
    let items: unknown[];

    if (req.is("application/json")) {
        items = parseJson(req.body);
    } else if (req.is("text/csv")) {
        if (typeof req.body !== "string" || req.body.trim() === "") {
            throw ApiError.unprocessable("Plik CSV jest pusty.");
        }
        items = parseCsv(req.body);
    } else {
        throw new ApiError({
            status: 415,
            title: "Nieobsługiwany format danych.",
            detail: "Dozwolone formaty: application/json lub text/csv.",
            type: "/problems/unsupported-media-type",
        });
    }

    const inserted = await importProducts(items);

    return res.status(200).json({
        message: "Pomyślnie zainicjalizowano produkty.",
        inserted,
    });
};
