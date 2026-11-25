import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { Order } from "../models/Order";
import { OrderStatus } from "../models/OrderStatus";
import { Product } from "../models/Product";
import { OrderType, OrderStatusChangeType } from "../types/Order";
import { ApiError } from "../utils/ApiError";

const allowedTransitions: Record<string, string[]> = {
    "NIEZATWIERDZONE": ["ZATWIERDZONE", "ANULOWANE"],
    "ZATWIERDZONE": ["ZREALIZOWANE", "ANULOWANE"],
    "ZREALIZOWANE": [],
    "ANULOWANE": []
};

export const GetOrders = async (req: Request, res: Response) => {
    const { status, username } = req.query;
    const filter: Record<string, unknown> = {};

    if (status) {
        if (typeof status !== "string") {
            throw ApiError.unprocessable("Niepoprawny typ parametru status.");
        }

        const statusDoc = await OrderStatus.findOne({ name: status });

        if (!statusDoc) {
            throw ApiError.notFound(`Status o nazwie ${status} nie istnieje w bazie danych.`);
        }
        filter.status = statusDoc._id;
    }

    if (username) {
        filter.username = username;
    }

    const result = await Order.find(filter);

    return res.status(200).json(result);
}

export const GetOrderById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw ApiError.badRequest(`ID ${id}, nie jest właściwym formatem identyfikatora zasobu.`);
    }

    const order = await Order.findById(id);

    if (!order) {
        throw ApiError.notFound(`Zamówienie o ID ${id} nie istnieje w bazie danych.`);
    }

    return res.status(200).json(order);
}

export const CreateOrder = async (req: Request, res: Response) => {
    const result = OrderType.safeParse(req.body);

    if (!result.success) {
        throw ApiError.fromZod(result.error, "Błędne dane zamówienia podczas tworzenia.");
    }

    const { items, ...customer } = result.data;

    const ids = items.map((item) => item.product);

    if (new Set(ids).size !== ids.length) {
        throw ApiError.unprocessable("Ten sam produkt występuje w zamówieniu więcej niż raz.");
    }

    const products = await Product.find({ _id: { $in: ids } });

    if (products.length !== ids.length) {
        throw ApiError.notFound("Co najmniej jeden z produktów nie istnieje w bazie danych.");
    }

    const status = await OrderStatus.findOne({ name: "NIEZATWIERDZONE" });

    if (!status) {
        throw ApiError.internal("Brak stanu NIEZATWIERDZONE w bazie danych.");
    }

    const orderItems = items.map((item) => {
        const product = products.find((p) => p.id === item.product)!;

        return {
            product: product._id,
            quantity: item.quantity,
            unitPrice: product.price
        }
    });

    const order = new Order({
        ...customer,
        status: status._id,
        items: orderItems
    });

    await order.save();

    return res.status(201).json({
        message: "Pomyślnie utworzono zamówienie",
        order
    })
}

export const UpdateOrderStatus = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw ApiError.badRequest(`ID ${id}, nie jest właściwym formatem identyfikatora zasobu.`);
    }

    const result = OrderStatusChangeType.safeParse(req.body);

    if (!result.success) {
        throw ApiError.fromZod(result.error, "Błędne dane podczas zmiany statusu zamówienia.");
    }

    const order = await Order.findById(id);

    if (!order) {
        throw ApiError.notFound(`Zamówienie o ID ${id} nie istnieje w bazie danych.`);
    }

    const newStatus = await OrderStatus.findOne({ name: result.data.status });

    if (!newStatus) {
        throw ApiError.notFound(`Status o nazwie ${result.data.status} nie istnieje w bazie danych.`);
    }

    const currentStatus = await OrderStatus.findById(order.status);

    if (!currentStatus) {
        throw ApiError.internal("Błąd wewnętrzny serwera. Nie znaleziono aktualnego statusu zamówienia.");
    }

    const allowed = allowedTransitions[currentStatus.name] ?? [];

    if (!allowed.includes(newStatus.name)) {
        throw ApiError.conflict(
            `Nie można zmienić statusu z ${currentStatus.name} na ${newStatus.name}.`,
            "/problems/invalid-status-transition"
        );
    }

    order.status = newStatus._id;

    if (newStatus.name === "ZATWIERDZONE") {
        order.approvedAt = new Date();
    }

    await order.save();

    return res.status(200).json({
        message: "Pomyślnie zmieniono status zamówienia.",
        order
    })
}
