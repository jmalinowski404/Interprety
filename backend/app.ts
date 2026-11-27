import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";

import { ApiError } from "./utils/ApiError";

import "./models/Category";
import "./models/OrderStatus";
import "./models/Product";
import "./models/Order";

import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import orderRoutes from "./routes/orderRoutes";
import orderStatusesRoutes from "./routes/orderStatusesRoutes";

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({ status: 'ok'});
})

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/order-statuses", orderStatusesRoutes);

const sendProblem = (req: Request, res: Response, err: ApiError) => {
    return res.status(err.status).type('application/problem+json').json({
        type: err.type,
        title: err.title,
        status: err.status,
        detail: err.detail,
        instance: req.originalUrl,
        ...(err.errors?.length ? { errors: err.errors } : {})
    });
};

app.use((req: Request, res: Response, next: NextFunction) => {
    next(ApiError.notFound(`Zasób ${req.originalUrl} nie istnieje.`));
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof ApiError) {
        return sendProblem(req, res, err);
    }

    if ((err as { type?: string })?.type === "entity.parse.failed") {
        return sendProblem(req, res, ApiError.badRequest("Ciało żądania zawiera niepoprawny JSON."));
    }

    console.error(`${req.method} ${req.originalUrl}`, err);

    return sendProblem(req, res, ApiError.internal());
});

export default app;