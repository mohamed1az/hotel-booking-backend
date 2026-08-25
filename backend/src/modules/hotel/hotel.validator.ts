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

})

export const updateHotelSchema=addHotelSchema.partial();

export type addHotelType=z.infer<typeof addHotelSchema>;
export type updateHotelType=z.infer<typeof updateHotelSchema>;