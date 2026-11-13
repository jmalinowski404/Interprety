import z from "zod";

export const OrderStatusType = {
    name: z.string().min(2)
}