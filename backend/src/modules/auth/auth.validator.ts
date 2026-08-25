import {z} from "zod"

export const loginSchema=z.object({
    email:z.string()
        .trim()
        .lowercase()
        .email(),
    password:z.string()
        .trim()
        .min(7)
        .max(20) 
})

export const registerSchema=z.object({
    name:z.string()
        .trim()
        .min(5)
        .max(30),
    email:z.string()
        .trim()
        .lowercase()
        .email({ pattern: z.regexes.html5Email }),
    password:z.string()
        .trim()
        .min(7)
        .max(20),
    role:z.enum(['USER','HOTEL_MANAGER'])
})

export type loginType = z.infer<typeof loginSchema>;
export type registerType=z.infer<typeof registerSchema>;