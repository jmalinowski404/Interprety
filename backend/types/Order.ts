import z from "zod";
import { isValidObjectId } from "mongoose";

export const OrderType = z.object({
    username: z.string().min(1),
    email: z.email(),
    phoneNumber: z.string().regex(/^\+?[0-9 \-]{9,15}$/),
    items: z.array(z.object({
        product: z.string().refine((v) => isValidObjectId(v)),
        quantity: z.int().positive()
    })).min(1)
})