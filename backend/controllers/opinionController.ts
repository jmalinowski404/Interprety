import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { Opinion } from "../models/Opinion";
import { Order } from "../models/Order";
import { OrderStatus } from "../models/OrderStatus";
import { OpinionType } from "../types/Opinion";
import { ApiError } from "../utils/ApiError";

const OPINION_ALLOWED_STATUSES = ["ZREALIZOWANE", "ANULOWANE"];

const findAccessibleOrder = async (req: Request) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw ApiError.badRequest(`ID ${id}, nie jest właściwym formatem identyfikatora zasobu.`);
    }

    const order = await Order.findById(id);

    if (!order) {
        throw ApiError.notFound(`Zamówienie o ID ${id} nie istnieje w bazie danych.`);
    }

    if (req.user!.role === "KLIENT" && !order.user.equals(req.user!.sub)) {
        throw ApiError.forbidden("Brak dostępu do zamówienia innego użytkownika.");
    }

    return order;
};

const toResponse = (opinion: InstanceType<typeof Opinion>) => ({
    _id: opinion.id,
    order: opinion.order,
    rating: opinion.rating,
    content: opinion.content,
    createdAt: opinion.createdAt,
});

const opinionExists = (orderId: string) =>
    ApiError.conflict(`Zamówienie o ID ${orderId} ma już opinię.`, "/problems/opinion-already-exists");

export const CreateOpinion = async (req: Request, res: Response) => {
    const order = await findAccessibleOrder(req);

    const result = OpinionType.safeParse(req.body);

    if (!result.success) {
        throw ApiError.fromZod(result.error, "Błędne dane opinii.");
    }

    const status = await OrderStatus.findById(order.status);

    if (!status || !OPINION_ALLOWED_STATUSES.includes(status.name)) {
        throw ApiError.conflict(
            `Opinię można dodać tylko do zamówienia w stanie ${OPINION_ALLOWED_STATUSES.join(" lub ")}. Aktualny stan: ${status?.name ?? "nieznany"}.`,
            "/problems/invalid-order-status"
        );
    }

    if (await Opinion.exists({ order: order._id })) {
        throw opinionExists(order.id);
    }

    let opinion;
    try {
        opinion = await Opinion.create({ ...result.data, order: order._id, user: req.user!.sub });
    } catch (err) {
        if ((err as { code?: number }).code === 11000) {
            throw opinionExists(order.id);
        }
        throw err;
    }

    return res.status(201).json({
        message: "Pomyślnie dodano opinię.",
        opinion: toResponse(opinion),
    });
};

export const GetOpinion = async (req: Request, res: Response) => {
    const order = await findAccessibleOrder(req);

    const opinion = await Opinion.findOne({ order: order._id });

    if (!opinion) {
        throw ApiError.notFound(`Zamówienie o ID ${order.id} nie ma jeszcze opinii.`);
    }

    return res.status(200).json(toResponse(opinion));
};
