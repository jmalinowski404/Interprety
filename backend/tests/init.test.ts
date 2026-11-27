import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import app from "../app";
import { Product } from "../models/Product";
import { authHeader, createCategory, setupTestDb } from "./helpers";

setupTestDb();

let employee: Record<string, string>;
let client: Record<string, string>;
let phonesId: string;

beforeEach(async () => {
    employee = await authHeader("pracownik", "PRACOWNIK");
    client = await authHeader("klient", "KLIENT");
    phonesId = await createCategory("Telefony");
    await createCategory("Laptopy");
});

const products = () => [
    { name: "iPhone 18", description: "Najnowszy telefon od Apple.", price: 3499.99, weight: 0.2, category: "Telefony" },
    { name: "MacBook Pro", description: "Laptop do pracy i nauki.", price: 8999, weight: 1.6, category: "Laptopy" },
    { name: "Pixel 11", description: "Telefon z czystym Androidem.", price: 2999, weight: 0.19, category: phonesId },
];

const csv = [
    "name,description,price,weight,category",
    'iPhone 18,"Telefon, aparat 48 Mpx",3499.99,0.2,Telefony',
    "MacBook Pro,Laptop do pracy i nauki.,8999,1.6,Laptopy",
].join("\n");

const init = (body: unknown, headers = employee) => request(app).post("/api/init").set(headers).send(body as object);

const initCsv = (body: string, headers = employee) =>
    request(app).post("/api/init").set(headers).set("Content-Type", "text/csv").send(body);

describe("POST /api/init – JSON", () => {
    test("200 i liczba dodanych produktów (tablica).", async () => {
        const res = await init(products());

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "Pomyślnie zainicjalizowano produkty.", inserted: 3 });

        const list = await request(app).get("/api/products");
        expect(list.body.map((p: { name: string }) => p.name).sort()).toEqual(["MacBook Pro", "Pixel 11", "iPhone 18"]);
        const pixel = list.body.find((p: { name: string }) => p.name === "Pixel 11");
        expect(pixel.category).toBe(phonesId);
    });

    test("200 dla obiektu z polem products.", async () => {
        const res = await init({ products: products() });

        expect(res.status).toBe(200);
        expect(res.body.inserted).toBe(3);
    });

    test("422 i brak zapisu, gdy jeden z produktów jest niepoprawny.", async () => {
        const data = products();
        data[1].price = -5;

        const res = await init(data);

        expect(res.status).toBe(422);
        expect(res.body.errors).toEqual([{ field: "[1].price", message: "Cena produktu musi być większa od 0." }]);
        expect(await Product.countDocuments()).toBe(0);
    });

    test("422 i brak zapisu przy duplikatach w pliku (bez względu na wielkość liter).", async () => {
        const data = [...products(), { ...products()[0], name: "IPHONE 18" }];

        const res = await init(data);

        expect(res.status).toBe(422);
        expect(res.body.detail).toContain("zduplikowane");
        expect(res.body.errors).toEqual([
            { field: "[3].name", message: 'Produkt "IPHONE 18" występuje w pliku więcej niż raz (pierwsze wystąpienie: [0]).' },
        ]);
        expect(await Product.countDocuments()).toBe(0);
    });

    test("422 i brak zapisu, gdy kategoria nie istnieje.", async () => {
        const data = products();
        data[2].category = "Telewizory";

        const res = await init(data);

        expect(res.status).toBe(422);
        expect(res.body.errors).toEqual([
            { field: "[2].category", message: 'Kategoria "Telewizory" nie istnieje w bazie danych.' },
        ]);
        expect(await Product.countDocuments()).toBe(0);
    });

    test("422 dla pustej tablicy.", async () => {
        const res = await init([]);

        expect(res.status).toBe(422);
        expect(await Product.countDocuments()).toBe(0);
    });

    test("409 gdy w bazie są już produkty.", async () => {
        expect((await init(products())).status).toBe(200);

        const res = await init([
            { name: "Nowy", description: "Zupełnie nowy produkt.", price: 10, weight: 1, category: "Telefony" },
        ]);

        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ status: 409, type: "/problems/already-initialized" });
        expect(await Product.countDocuments()).toBe(3);
    });
});

describe("POST /api/init – CSV", () => {
    test("200 i poprawne wartości liczbowe oraz pola w cudzysłowach.", async () => {
        const res = await initCsv(csv);

        expect(res.status).toBe(200);
        expect(res.body.inserted).toBe(2);

        const iphone = await Product.findOne({ name: "iPhone 18" });
        expect(iphone).toMatchObject({ description: "Telefon, aparat 48 Mpx", price: 3499.99, weight: 0.2 });
    });

    test("422 i brak zapisu, gdy cena nie jest liczbą.", async () => {
        const res = await initCsv(csv.replace("8999", "dużo"));

        expect(res.status).toBe(422);
        expect(res.body.errors[0].field).toBe("[1].price");
        expect(await Product.countDocuments()).toBe(0);
    });

    test("422 gdy brakuje kolumny w nagłówku.", async () => {
        const res = await initCsv("name,description,price,category\nA,Opis produktu,1,Telefony");

        expect(res.status).toBe(422);
        expect(res.body.errors).toEqual([{ field: "weight", message: "Brak kolumny w nagłówku pliku." }]);
    });

    test("400 dla uszkodzonego pliku CSV.", async () => {
        const res = await initCsv('name,description,price,weight,category\n"iPhone,bez zamknięcia,1,1,Telefony');

        expect(res.status).toBe(400);
        expect(await Product.countDocuments()).toBe(0);
    });
});

describe("POST /api/init – dostęp i format", () => {
    test("401 bez tokenu.", async () => {
        const res = await request(app).post("/api/init").send(products());

        expect(res.status).toBe(401);
        expect(await Product.countDocuments()).toBe(0);
    });

    test("403 dla KLIENTA.", async () => {
        const res = await init(products(), client);

        expect(res.status).toBe(403);
        expect(await Product.countDocuments()).toBe(0);
    });

    test("415 dla nieobsługiwanego formatu.", async () => {
        const res = await request(app)
            .post("/api/init")
            .set(employee)
            .set("Content-Type", "application/xml")
            .send("<products/>");

        expect(res.status).toBe(415);
    });
});
