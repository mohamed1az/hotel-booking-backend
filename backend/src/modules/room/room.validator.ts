import {z} from "zod"

export const roomShcema=z.object({
    roomNumber:z.string()
        .trim()
        .min(1)
        .max(10),
    isAvailable:z.boolean()
        .default(true)
})

export const updateRoomSchema=roomShcema.partial();

export type roomSchemaType=z.infer<typeof roomShcema>;
export type updateRoomSchemaType=z.infer<typeof updateRoomSchema>;