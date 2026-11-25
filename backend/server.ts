import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

import "./models/Category";
import "./models/OrderStatus";
import "./models/Product";
import "./models/Order";

import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import orderRoutes from "./routes/orderRoutes";
import orderStatusesRoutes from "./routes/orderStatusesRoutes";

const app = express();
const port = 4000;

app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({ status: 'ok'});
})

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/order-statuses", orderStatusesRoutes);

app.use((req: Request, res: Response) => {
    return res.status(404).type('application/problem+json').json({
        type: "about:blank",
        title: "Brak takiego zasobu.",
        status: 404,
        detail: `Zasób ${req.originalUrl} nie istnieje.`,
        instance: req.originalUrl
    })
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }

    // Niepoprawna składnia ciała żądania (np. zepsuty JSON) -> 400
    if (err?.type === "entity.parse.failed") {
        return res.status(400).type('application/problem+json').json({
            type: "about:blank",
            title: "Niepoprawny JSON.",
            status: 400,
            detail: "Ciało żądania zawiera niepoprawny JSON.",
            instance: req.originalUrl
        })
    }

    console.log(err);

    return res.status(500).type('application/problem+json').json({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.",
        instance: req.originalUrl
    })
});

mongoose
    .connect(process.env.MONGO_URI as string)
    .then(async () => {
        console.log('Połączono z bazą');
    })
    .catch((err) => {
        console.error('Błąd połączenia z bazą:', err.message);
    });

app.listen(port, () => {
    console.log(`Backend działa na porcie ${port}`);
})