import request from "supertest";
import mongoose from "mongoose";
import { beforeEach, describe, expect, test } from "vitest";
import app from "../app";
import { Opinion } from "../models/Opinion";
import { authHeader, createCategory, productData, setupTestDb } from "./helpers";

setupTestDb();

let employee: Record<string, string>;
let alice: Record<string, string>;
let bob: Record<string, string>;
let product: string;

beforeEach(async () => {
    employee = await authHeader("pracownik", "PRACOWNIK");
    alice = await authHeader("alice", "KLIENT");
    bob = await authHeader("bob", "KLIENT");

    const category = await createCategory();
    const res = await request(app).post("/api/products").set(employee).send(productData(category));
    product = res.body.product._id;
});

const createOrder = async (owner = alice) => {
    const res = await request(app)
        .post("/api/orders")
        .set(owner)
        .send({
            username: "alice",
            email: "alice@example.com",
            phoneNumber: "+48 123 456 789",
            items: [{ product, quantity: 1 }],
        });
    expect(res.status).toBe(201);
    return res.body.order._id as string;
};

const changeStatus = async (orderId: string, ...statuses: string[]) => {
    for (const status of statuses) {
        const res = await request(app).patch(`/api/orders/${orderId}/status`).set(employee).send({ status });
        expect(res.status).toBe(200);
    }
};

const completedOrder = async (owner = alice) => {
    const id = await createOrder(owner);
    await changeStatus(id, "ZATWIERDZONE", "ZREALIZOWANE");
    return id;
};

const postOpinion = (orderId: string, body: unknown, headers = alice) =>
    request(app).post(`/api/orders/${orderId}/opinions`).set(headers).send(body as object);

const opinion = { rating: 5, content: "Szybka wysyłka, świetny kontakt." };

describe("POST /api/orders/:id/opinions", () => {
    test("201 dla zamówienia ZREALIZOWANEGO.", async () => {
        const orderId = await completedOrder();
        const before = Date.now();

        const res = await postOpinion(orderId, opinion);

        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Pomyślnie dodano opinię.");
        expect(res.body.opinion).toMatchObject({ order: orderId, rating: 5, content: "Szybka wysyłka, świetny kontakt." });
        const createdAt = new Date(res.body.opinion.createdAt).getTime();
        expect(createdAt).toBeGreaterThanOrEqual(before - 1000);
        expect(createdAt).toBeLessThanOrEqual(Date.now());
    });

    test("201 dla zamówienia ANULOWANEGO.", async () => {
        const orderId = await createOrder();
        await changeStatus(orderId, "ANULOWANE");

        const res = await postOpinion(orderId, { rating: 1, content: "Zamówienie anulowane bez kontaktu." });

        expect(res.status).toBe(201);
        expect(res.body.opinion.rating).toBe(1);
    });

    test("data utworzenia jest ustalana przez serwer, a nie klienta.", async () => {
        const orderId = await completedOrder();

        const res = await postOpinion(orderId, { ...opinion, createdAt: "2000-01-01T00:00:00.000Z" });

        expect(res.status).toBe(422);
        expect(await Opinion.countDocuments()).toBe(0);
    });

    test.each([
        ["NIEZATWIERDZONE", []],
        ["ZATWIERDZONE", ["ZATWIERDZONE"]],
    ])("409 dla zamówienia w stanie %s.", async (state, transitions) => {
        const orderId = await createOrder();
        await changeStatus(orderId, ...transitions);

        const res = await postOpinion(orderId, opinion);

        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ type: "/problems/invalid-order-status" });
        expect(res.body.detail).toContain(`Aktualny stan: ${state}.`);
        expect(await Opinion.countDocuments()).toBe(0);
    });

    test("409 przy ponownym dodaniu opinii do tego samego zamówienia.", async () => {
        const orderId = await completedOrder();
        expect((await postOpinion(orderId, opinion)).status).toBe(201);

        const res = await postOpinion(orderId, { rating: 1, content: "Druga opinia." });

        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({
            status: 409,
            type: "/problems/opinion-already-exists",
            detail: `Zamówienie o ID ${orderId} ma już opinię.`,
        });

        const get = await request(app).get(`/api/orders/${orderId}/opinions`).set(alice);
        expect(get.body.rating).toBe(5);
    });

    test.each([
        ["pusta treść", { rating: 4, content: "" }, "content", "Treść opinii nie może być pusta."],
        ["treść z samych spacji", { rating: 4, content: "   " }, "content", "Treść opinii nie może być pusta."],
        ["brak treści", { rating: 4 }, "content", "Treść opinii musi być tekstem."],
        ["ocena 0", { rating: 0, content: "Ok" }, "rating", "Ocena musi być w zakresie 1-5."],
        ["ocena 6", { rating: 6, content: "Ok" }, "rating", "Ocena musi być w zakresie 1-5."],
        ["ocena ułamkowa", { rating: 4.5, content: "Ok" }, "rating", "Ocena musi być liczbą całkowitą."],
        ["ocena jako tekst", { rating: "5", content: "Ok" }, "rating", "Ocena musi być liczbą całkowitą."],
    ])("422 – %s.", async (_, body, field, message) => {
        const orderId = await completedOrder();

        const res = await postOpinion(orderId, body);

        expect(res.status).toBe(422);
        expect(res.headers["content-type"]).toContain("application/problem+json");
        expect(res.body.errors).toEqual([{ field, message }]);
        expect(await Opinion.countDocuments()).toBe(0);
    });

    test("400 dla niepoprawnego ID zamówienia.", async () => {
        const res = await postOpinion("abc", opinion);

        expect(res.status).toBe(400);
    });

    test("404 dla nieistniejącego zamówienia.", async () => {
        const res = await postOpinion(new mongoose.Types.ObjectId().toString(), opinion);

        expect(res.status).toBe(404);
    });

    test("401 bez tokenu.", async () => {
        const orderId = await completedOrder();

        const res = await request(app).post(`/api/orders/${orderId}/opinions`).send(opinion);

        expect(res.status).toBe(401);
    });

    test("403 gdy opinię dodaje inny klient niż składający zamówienie.", async () => {
        const orderId = await completedOrder(alice);

        const res = await postOpinion(orderId, opinion, bob);

        expect(res.status).toBe(403);
        expect(await Opinion.countDocuments()).toBe(0);
    });

    test("403 gdy opinię dodaje PRACOWNIK.", async () => {
        const orderId = await completedOrder();

        const res = await postOpinion(orderId, opinion, employee);

        expect(res.status).toBe(403);
    });
});

describe("GET /api/orders/:id/opinions", () => {
    test("właściciel zamówienia i PRACOWNIK widzą opinię.", async () => {
        const orderId = await completedOrder();
        const created = await postOpinion(orderId, opinion);

        for (const headers of [alice, employee]) {
            const res = await request(app).get(`/api/orders/${orderId}/opinions`).set(headers);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(created.body.opinion);
        }
    });

    test("PRACOWNIK widzi opinie do zamówień różnych klientów.", async () => {
        const a = await completedOrder(alice);
        const b = await completedOrder(bob);
        await postOpinion(a, { rating: 5, content: "Opinia Alice." }, alice);
        await postOpinion(b, { rating: 2, content: "Opinia Boba." }, bob);

        const resA = await request(app).get(`/api/orders/${a}/opinions`).set(employee);
        const resB = await request(app).get(`/api/orders/${b}/opinions`).set(employee);

        expect(resA.body.content).toBe("Opinia Alice.");
        expect(resB.body.content).toBe("Opinia Boba.");
    });

    test("403 gdy klient pobiera opinię do cudzego zamówienia.", async () => {
        const orderId = await completedOrder(alice);
        await postOpinion(orderId, opinion);

        const res = await request(app).get(`/api/orders/${orderId}/opinions`).set(bob);

        expect(res.status).toBe(403);
        expect(res.body.content).toBeUndefined();
    });

    test("404 gdy zamówienie nie ma opinii.", async () => {
        const orderId = await completedOrder();

        const res = await request(app).get(`/api/orders/${orderId}/opinions`).set(alice);

        expect(res.status).toBe(404);
        expect(res.body.detail).toBe(`Zamówienie o ID ${orderId} nie ma jeszcze opinii.`);
    });

    test("401 bez tokenu.", async () => {
        const orderId = await completedOrder();

        const res = await request(app).get(`/api/orders/${orderId}/opinions`);

        expect(res.status).toBe(401);
    });
});
