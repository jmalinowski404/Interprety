import { isObjectIdOrHexString } from "mongoose";
import z from "zod";

export const ProductType = z.object({
    name: z.string().trim().min(2, "Nazwa produktu musi mieć co najmniej 2 znaki."),
    description: z.string().trim().min(8, "Opis produktu musi mieć co najmniej 8 znaków."),
    price: z.number().positive("Cena produktu musi być większa od 0."),
    weight: z.number().positive("Waga produktu musi być większa od 0."),
    category: z.string().refine(isObjectIdOrHexString, "Nieprawidłowy format ID kategorii.")
})

export const ProductUpdateType = ProductType.partial().refine(
    (data) => Object.keys(data).length > 0,
    "Brak pól do aktualizacji."
)


export const ImportProductType = ProductType.extend({
    category: z.string({ error: "Kategoria jest wymagana." }).trim().min(1, "Kategoria jest wymagana.")
})

export const ImportPayloadType = z.array(z.unknown()).min(1, "Plik nie zawiera żadnych produktów.")
