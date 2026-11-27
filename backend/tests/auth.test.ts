import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, test } from "vitest";
import app from "../app";
import { User } from "../models/User";
import { authHeader, createCategory, createUser, productData, setupTestDb } from "./helpers";

setupTestDb();

describe("POST /api/login", () => {
    beforeEach(async () => {
        await createUser("klient", "tajne-haslo", "KLIENT");
    });

    test("zwraca token JWT ważny 1 godzinę dla poprawnych danych.", async () => {
        const res = await request(app).post("/api/login").send({ login: "klient", password: "tajne-haslo" });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            tokenType: "Bearer",
            expiresIn: 3600,
            user: { login: "klient", role: "KLIENT" },
        });

        const payload = jwt.decode(res.body.accessToken) as jwt.JwtPayload;
        expect(payload).toMatchObject({ login: "klient", role: "KLIENT", sub: res.body.user.id });
        expect(payload.exp! - payload.iat!).toBe(3600);
    });

    test("401 przy złym haśle.", async () => {
        const res = await request(app).post("/api/login").send({ login: "klient", password: "zle" });

        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ status: 401, detail: "Niepoprawny login lub hasło." });
        expect(res.body.accessToken).toBeUndefined();
    });

    test("401 z tym samym komunikatem dla nieistniejącego loginu.", async () => {
        const res = await request(app).post("/api/login").send({ login: "nie-ma", password: "tajne-haslo" });

        expect(res.status).toBe(401);
        expect(res.body.detail).toBe("Niepoprawny login lub hasło.");
    });

    test("422 gdy brakuje danych logowania.", async () => {
        const res = await request(app).post("/api/login").send({});

        expect(res.status).toBe(422);
        const fields = res.body.errors.map((e: { field: string }) => e.field);
        expect(fields).toEqual(expect.arrayContaining(["login", "password"]));
    });

    test("hasło nie jest przechowywane jawnie.", async () => {
        const user = await User.findOne({ login: "klient" }).select("+passwordHash");

        expect(user!.passwordHash).not.toBe("tajne-haslo");
        expect(user!.passwordHash).toMatch(/^\$2[aby]\$/);
    });
});

describe("401 Unauthorized", () => {
    test("brak nagłówka Authorization.", async () => {
        const res = await request(app).get("/api/orders");

        expect(res.status).toBe(401);
        expect(res.headers["www-authenticate"]).toContain("Bearer");
        expect(res.body).toMatchObject({ status: 401, type: "/problems/unauthorized" });
    });

    test("zły format nagłówka (bez Bearer).", async () => {
        const res = await request(app).get("/api/orders").set("Authorization", "Token abc");

        expect(res.status).toBe(401);
    });

    test("token podpisany innym kluczem.", async () => {
        const forged = jwt.sign({ login: "x", role: "PRACOWNIK" }, "inny-klucz", { subject: "1" });
        const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${forged}`);

        expect(res.status).toBe(401);
        expect(res.body.detail).toBe("Token jest niepoprawny lub wygasł.");
    });

    test("token wygasły.", async () => {
        const expired = jwt.sign(
            { login: "x", role: "PRACOWNIK", exp: Math.floor(Date.now() / 1000) - 10 },
            process.env.JWT_SECRET!,
            { subject: "1" }
        );
        const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${expired}`);

        expect(res.status).toBe(401);
    });

    test("niezalogowany nie może dodać produktu.", async () => {
        const category = await createCategory();
        const res = await request(app).post("/api/products").send(productData(category));

        expect(res.status).toBe(401);
    });
});

describe("Dostęp publiczny", () => {
    test.each(["/api/products", "/api/categories", "/api/order-statuses"])(
        "GET %s nie wymaga tokenu.",
        async (url) => {
            const res = await request(app).get(url);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        }
    );
});

describe("403 Forbidden i izolacja zamówień", () => {
    let employee: Record<string, string>;
    let alice: Record<string, string>;
    let bob: Record<string, string>;
    let product: string;

    const order = (product: string) => ({
        username: "klient",
        email: "klient@example.com",
        phoneNumber: "+48 123 456 789",
        items: [{ product, quantity: 1 }],
    });

    beforeEach(async () => {
        employee = await authHeader("pracownik", "PRACOWNIK");
        alice = await authHeader("alice", "KLIENT");
        bob = await authHeader("bob", "KLIENT");

        const category = await createCategory();
        const res = await request(app).post("/api/products").set(employee).send(productData(category));
        product = res.body.product._id;
    });

    test("KLIENT nie może dodać produktu.", async () => {
        const category = await createCategory("Inna");
        const res = await request(app).post("/api/products").set(alice).send(productData(category, { name: "Nowy" }));

        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ status: 403, type: "/problems/forbidden" });
    });

    test("KLIENT nie może zmienić produktu.", async () => {
        const res = await request(app).patch(`/api/products/${product}`).set(alice).send({ price: 1 });

        expect(res.status).toBe(403);
    });

    test("PRACOWNIK nie może złożyć zamówienia.", async () => {
        const res = await request(app).post("/api/orders").set(employee).send(order(product));

        expect(res.status).toBe(403);
    });

    test("KLIENT nie może zmienić stanu zamówienia.", async () => {
        const created = await request(app).post("/api/orders").set(alice).send(order(product));
        const res = await request(app)
            .patch(`/api/orders/${created.body.order._id}/status`)
            .set(alice)
            .send({ status: "ZATWIERDZONE" });

        expect(res.status).toBe(403);
    });

    test("KLIENT widzi na liście tylko własne zamówienia, PRACOWNIK – wszystkie.", async () => {
        const a = await request(app).post("/api/orders").set(alice).send(order(product));
        const b = await request(app).post("/api/orders").set(bob).send(order(product));
        expect(a.status).toBe(201);
        expect(b.status).toBe(201);

        const aliceList = await request(app).get("/api/orders").set(alice);
        expect(aliceList.status).toBe(200);
        expect(aliceList.body.map((o: { _id: string }) => o._id)).toEqual([a.body.order._id]);

        const employeeList = await request(app).get("/api/orders").set(employee);
        expect(employeeList.body).toHaveLength(2);
    });

    test("KLIENT nie może podejrzeć zamówienia innego klienta (403).", async () => {
        const bobsOrder = await request(app).post("/api/orders").set(bob).send(order(product));

        const res = await request(app).get(`/api/orders/${bobsOrder.body.order._id}`).set(alice);

        expect(res.status).toBe(403);
        expect(res.body.detail).toBe("Brak dostępu do zamówienia innego użytkownika.");
        expect(res.body.items).toBeUndefined();
    });

    test("KLIENT nie obejdzie filtra parametrem username.", async () => {
        await request(app).post("/api/orders").set(bob).send({ ...order(product), username: "bob" });

        const res = await request(app).get("/api/orders?username=bob").set(alice);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});
