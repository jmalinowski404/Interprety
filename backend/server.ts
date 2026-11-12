import "dotenv/config";
import express from "express";
import mongoose from "mongoose";

import "./models/Category";
import "./models/OrderStatus";
import "./models/Product";
import "./models/Order";

import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import orderRoutes from "./routes/orderRoutes";

const app = express();
const port = 4000;

app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({ status: 'ok'});
})

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);

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