import z from "zod";

export const ProductType = z.object({
    name: z.string().min(2),
    description: z.string().min(8),
    price: z.float64(),
    weight: z.float64(),
    category: z.string()
})