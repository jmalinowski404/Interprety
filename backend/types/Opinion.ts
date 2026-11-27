import z from "zod";

export const OpinionType = z.strictObject({
    rating: z.int("Ocena musi być liczbą całkowitą.")
        .min(1, "Ocena musi być w zakresie 1-5.")
        .max(5, "Ocena musi być w zakresie 1-5."),
    content: z.string("Treść opinii musi być tekstem.")
        .trim()
        .min(1, "Treść opinii nie może być pusta.")
        .max(2000, "Treść opinii może mieć maksymalnie 2000 znaków."),
}, "Niedozwolone pole w opinii.")
