import request from "supertest";
import { describe, expect, test } from "vitest";
import app from "../app";
import { beforeEach } from "vitest";
import { authHeader, createCategory, productData, setupTestDb } from "./helpers";

setupTestDb();

let employee: Record<string, string>;

beforeEach(async () => {
    employee = await authHeader("pracownik", "PRACOWNIK");
});

describe("POST /api/products", () => {
    test("Poprawnie dodaje produkt.", async () => {
        const category = await createCategory();

        const res = await request(app).post("/api/products").set(employee).send(productData(category));

        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Pomyślnie utworzono produkt");
        expect(res.body.product).toMatchObject({
            name: "iPhone 18",
            description: "Najnowszy egzemplarz od Apple.",
            price: 3499.99,
            weight: 1.03,
            category,
        });
        expect(res.body.product._id).toBeDefined();

        const get = await request(app).get(`/api/products/${res.body.product._id}`);
        expect(get.status).toBe(200);
        expect(get.body.name).toBe("iPhone 18");
    });

    test("422 podczas ujemnej ceny.", async () => {
        const category = await createCategory();

        const res = await request(app).post("/api/products").set(employee).send(productData(category, { price: -2 }));

        expect(res.status).toBe(422);
        expect(res.headers["content-type"]).toContain("application/problem+json");
        expect(res.body).toMatchObject({ status: 422, type: "/problems/validation-error" });
        expect(res.body.errors).toEqual([
            { field: "price", message: "Cena produktu musi być większa od 0." },
        ]);
    });

    test("422 podczas ujemnej wagi.", async () => {
        const category = await createCategory();

        const res = await request(app).post("/api/products").set(employee).send(productData(category, { weight: -2.3 }));

        expect(res.status).toBe(422);
        expect(res.body.errors).toEqual([
            { field: "weight", message: "Waga produktu musi być większa od 0." },
        ]);
    });

    test("422 gdy cena i waga są tekstem zamiast liczby.", async () => {
        const category = await createCategory();

        const res = await request(app)
            .post("/api/products").set(employee)
            .send(productData(category, { price: "3499.99", weight: "1.03" }));

        expect(res.status).toBe(422);
        const fields = res.body.errors.map((e: { field: string }) => e.field);
        expect(fields).toEqual(expect.arrayContaining(["price", "weight"]));
    });

    test("422 gdy kategoria nie istnieje.", async () => {
        const res = await request(app)
            .post("/api/products").set(employee)
            .send(productData("507f1f77bcf86cd799439011"));

        expect(res.status).toBe(422);
        expect(res.body.errors).toEqual([{ field: "category", message: "Kategoria nie istnieje." }]);

        const list = await request(app).get("/api/products");
        expect(list.body).toEqual([]);
    });
});
