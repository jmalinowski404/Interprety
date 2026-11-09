import "dotenv/config";
import express from "express";
import mongoose from "mongoose";

import "./models/Category";
import "./models/OrderStatus";
import "./models/Product";
import "./models/Order";

import productRoutes from "./routes/productRoutes";

const app = express();
const port = 4000;

app.get("/api/health", (req, res) => {
    res.json({ status: 'ok'});
})

app.use("/api/products", productRoutes);

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