import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { Order } from "../models/Order";
import { OrderStatus } from "../models/OrderStatus";
import { Product } from "../models/Product";
import { OrderType, OrderStatusChangeType } from "../types/Order";

export const GetOrders = async (req: Request, res: Response) => {
    try {
        const { status, username } = req.query;
        const filter: Record<string, unknown> = {};

        if (status) {
            if (typeof status !== "string") {
                return res.status(400).json({
                    message: "Niepoprawny typ parametru status."
                })
            }

            const statusDoc = await OrderStatus.findOne({ name: status });
            
            if (!statusDoc) {
                return res.status(404).json({
                    message: "Nie znaleziono statusu o podanej nazwie."
                })
            }
            filter.status = statusDoc._id; 
        }

        if (username) {
            filter.username = username;
        }

        const result = await Order.find(filter);

        if(result.length < 1) {
            return res.status(404).json({
                message: "Nie znaleziono zamówień spełniających kryteria."
            });
        }

        return res.status(200).json(result);
    } catch (e) {
        console.log(e);

        return res.status(500).type('application/problem+json').json({
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
            detail: "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.",
            instance: req.originalUrl
        })
    }
}

export const GetOrderById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(404).json({
                message: "Nie znaleziono zamówienia o podanym identyfikatorze."
            })
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                message: "Nie znaleziono zamówienia o podanym identyfikatorze."
            })
        }

        return res.status(200).json(order);
    } catch (e) {
        console.log(e);

        return res.status(500).type('application/problem+json').json({
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
            detail: "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.",
            instance: req.originalUrl
        })
    }
}

export const CreateOrder = async (req: Request, res: Response) => {
    try {
        const result = OrderType.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Błędne dane zamówienia podczas tworzenia."
            })
        }

        const { items, ...customer } = result.data;

        const ids = items.map((item) => item.product);

        if (new Set(ids).size !== ids.length) {
            return res.status(400).json({
                message: "Ten sam produkt występuje w zamówieniu więcej niż raz."
            })
        }

        const products = await Product.find({ _id: { $in: ids } });

        if (products.length !== ids.length) {
            return res.status(404).json({
                message: "Co najmniej jeden z produktów nie istnieje w bazie danych."
            })
        }

        const status = await OrderStatus.findOne({ name: "NIEZATWIERDZONE" });

        if (!status) {
            return res.status(500).type('application/problem+json').json({
                type: "about:blank",
                title: "Internal Server Error",
                status: 500,
                detail: "Brak stanu NIEZATWIERDZONE w bazie danych.",
                instance: req.originalUrl
            })
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

        try {
            await order.save()
        } catch (e) {
            console.log(e);

            return res.status(500).type('application/problem+json').json({
                type: "about:blank",
                title: "Internal Server Error",
                status: 500,
                detail: "Wystąpił błąd podczas zapisywania zamówienia.",
                instance: req.originalUrl
            })
        }

        return res.status(201).json({
            message: "Pomyślnie utworzono zamówienie",
            order
        })
    } catch (e) {
        console.log(e);

        return res.status(500).type('application/problem+json').json({
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
            detail: "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.",
            instance: req.originalUrl
        })
    }
}

const allowedTransitions: Record<string, string[]> = {
    "NIEZATWIERDZONE": ["ZATWIERDZONE", "ANULOWANE"],
    "ZATWIERDZONE": ["ZREALIZOWANE", "ANULOWANE"],
    "ZREALIZOWANE": [],
    "ANULOWANE": []
};

export const UpdateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(404).json({
                message: "Nie znaleziono zamówienia o podanym identyfikatorze."
            })
        }

        const result = OrderStatusChangeType.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Błędne dane podczas zmiany statusu zamówienia."
            })
        }
        
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                message: "Nie znaleziono zamówienia o podanym identyfikatorze."
            })
        }

        const newStatus = await OrderStatus.findOne({ name: result.data.status });

        if (!newStatus) {
            return res.status(404).json({
                message: "Nie znaleziono statusu o podanej nazwie."
            })
        }
        
        const currentStatus = await OrderStatus.findById(order.status);

        if (!currentStatus) {
            return res.status(500).type('application/problem+json').json({
                type: "about:blank",
                title: "Internal Server Error",
                status: 500,
                detail: "Błąd wewnętrzny serwera. Nie znaleziono aktualnego statusu zamówienia.",
                instance: req.originalUrl
            })
        }
        
        const allowed = allowedTransitions[currentStatus.name] ?? [];

        if (!allowed.includes(newStatus.name)) {
            return res.status(400).json({
                message: `Nie można zmienić statusu z ${currentStatus.name} na ${newStatus.name}.`
            })
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
    } catch (e) {
        console.log(e);

        return res.status(500).type('application/problem+json').json({
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
            detail: "Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania.",
            instance: req.originalUrl
        })
    }
}