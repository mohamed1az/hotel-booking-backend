import {z} from "zod"

export const RoomTypeSchema=z.object({
    title:z.string()
        .trim()
        .min(1)
        .max(20),
    description:z.string()
        .trim()
        .min(1)
        .max(50)
        .optional(),
    pricePerNight:z.coerce.number()
        .min(1),
    capacity:z.coerce.number()
        .int(),
    images: z.array(z.string()).optional()
     
});

export const updatRoomTypeSchema=RoomTypeSchema.partial();

export type addRoomType=z.infer<typeof RoomTypeSchema>
export type updateRoomType=z.infer<typeof updatRoomTypeSchema>