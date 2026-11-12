import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { Order } from "../models/Order";
import { OrderStatus } from "../models/OrderStatus";
import { Product } from "../models/Product";
import { OrderType } from "../types/Order";

export const GetOrders = async (req: Request, res: Response) => {
    try {
        const { status, username } = req.query;
        const filter: Record<string, unknown> = {};

        if (status) {
            if (!isValidObjectId(status)) {
                return res.status(400).json({
                    message: "Nieprawidłowy format ID statusu."
                });
            }
            filter.status = status;
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
        return res.status(500).json({
            message: "Wystąpił błąd serwera.",
            error: e
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
        return res.status(500).json({
            message: "Wystąpił błąd serwera.",
            error: e
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
            return res.status(500).json({
                message: "Brak stanu NIEZATWIERDZONE w bazie danych."
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
            return res.status(500).json({
                message: "Błąd podczas zapisywania zamówienia.",
                error: e
            })
        }

        return res.status(201).json({
            message: "Pomyślnie utworzono zamówienie",
            order
        })
    } catch (e) {
        return res.status(500).json({
            message: "Wystąpił błąd serwera.",
            error: e
        })
    }
}