import request from "supertest";
import mongoose from "mongoose";
import { beforeEach, describe, expect, test } from "vitest";
import app from "../app";
import { OrderStatus } from "../models/OrderStatus";
import { authHeader, createCategory, productData, setupTestDb } from "./helpers";

setupTestDb();

const customer = {
    username: "jan.kowalski",
    email: "jan@example.com",
    phoneNumber: "+48 123 456 789",
};

let employee: Record<string, string>;
let client: Record<string, string>;

const createProduct = async (category: string, name: string, price: number) => {
    const res = await request(app).post("/api/products").set(employee).send(productData(category, { name, price }));
    expect(res.status).toBe(201);
    return res.body.product._id as string;
};

const statusId = async (name: string) => (await OrderStatus.findOne({ name }))!.id as string;

let phone: string;
let laptop: string;

beforeEach(async () => {
    employee = await authHeader("pracownik", "PRACOWNIK");
    client = await authHeader("jan.kowalski", "KLIENT");
    const category = await createCategory("Elektronika");
    phone = await createProduct(category, "iPhone 18", 3499.99);
    laptop = await createProduct(category, "MacBook Pro", 8999);
});

const createOrder = async () => {
    const res = await request(app)
        .post("/api/orders").set(client)
        .send({
            ...customer,
            items: [
                { product: phone, quantity: 2 },
                { product: laptop, quantity: 1 },
            ],
        });
    expect(res.status).toBe(201);
    return res.body.order;
};

describe("POST /api/orders", () => {
    test("Poprawnie tworzy zamówienie z dwoma różnymi produktami.", async () => {
        const res = await request(app)
            .post("/api/orders").set(client)
            .send({
                ...customer,
                items: [
                    { product: phone, quantity: 2 },
                    { product: laptop, quantity: 1 },
                ],
            });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Pomyślnie utworzono zamówienie");
        expect(res.body.order).toMatchObject({
            ...customer,
            status: await statusId("NIEZATWIERDZONE"),
            approvedAt: null,
            items: [
                { product: phone, quantity: 2, unitPrice: 3499.99 },
                { product: laptop, quantity: 1, unitPrice: 8999 },
            ],
        });

        const get = await request(app).get(`/api/orders/${res.body.order._id}`).set(client);
        expect(get.status).toBe(200);
        expect(get.body.items).toHaveLength(2);
    });

    test("404 gdy zamówienie zawiera nieistniejący produkt.", async () => {
        const missing = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
            .post("/api/orders").set(client)
            .send({
                ...customer,
                items: [
                    { product: phone, quantity: 1 },
                    { product: missing, quantity: 1 },
                ],
            });

        expect(res.status).toBe(404);
        expect(res.headers["content-type"]).toContain("application/problem+json");
        expect(res.body).toMatchObject({
            status: 404,
            type: "/problems/not-found",
            detail: "Co najmniej jeden z produktów nie istnieje w bazie danych.",
        });

        const list = await request(app).get("/api/orders").set(employee);
        expect(list.body).toEqual([]);
    });
});

describe("PATCH /api/orders/:id/status", () => {
    test("409 przy niedozwolonej zmianie NIEZATWIERDZONE -> ZREALIZOWANE.", async () => {
        const order = await createOrder();

        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`).set(employee)
            .send({ status: "ZREALIZOWANE" });

        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({
            status: 409,
            type: "/problems/invalid-status-transition",
            detail: "Nie można zmienić statusu z NIEZATWIERDZONE na ZREALIZOWANE.",
        });

        const get = await request(app).get(`/api/orders/${order._id}`).set(employee);
        expect(get.body.status).toBe(await statusId("NIEZATWIERDZONE"));
    });

    test("409 przy próbie zmiany stanu anulowanego zamówienia.", async () => {
        const order = await createOrder();

        const cancel = await request(app)
            .patch(`/api/orders/${order._id}/status`).set(employee)
            .send({ status: "ANULOWANE" });
        expect(cancel.status).toBe(200);
        expect(cancel.body.order.status).toBe(await statusId("ANULOWANE"));

        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`).set(employee)
            .send({ status: "ZATWIERDZONE" });

        expect(res.status).toBe(409);
        expect(res.body.detail).toBe("Nie można zmienić statusu z ANULOWANE na ZATWIERDZONE.");
    });
});

describe("Zmiana ceny produktu", () => {
    test("nie wpływa na wartość istniejącego zamówienia.", async () => {
        const order = await createOrder();

        const update = await request(app).patch(`/api/products/${phone}`).set(employee).send({ price: 1999.99 });
        expect(update.status).toBe(200);
        expect(update.body.product.price).toBe(1999.99);

        const get = await request(app).get(`/api/orders/${order._id}`).set(employee);

        expect(get.status).toBe(200);
        expect(get.body.items).toEqual([
            { product: phone, quantity: 2, unitPrice: 3499.99 },
            { product: laptop, quantity: 1, unitPrice: 8999 },
        ]);
    });
});
