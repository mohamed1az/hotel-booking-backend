import {z} from "zod"

export const addHotelSchema=z.object({
    name:z.string()
        .trim()
        .min(1)
        .max(30),
    address:z.string()
        .trim()
        .min(1)
        .max(100),
    images: z.array(z.string().url("Each image must be a valid URL"))
        .optional()
        .default([])

})

export const updateHotelSchema=addHotelSchema.partial();

export type addHotelType=z.infer<typeof addHotelSchema>;
export type updateHotelType=z.infer<typeof updateHotelSchema>;