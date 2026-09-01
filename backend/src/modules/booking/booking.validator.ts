import {z} from "zod"
import {isBefore,parseISO,differenceInDays} from "date-fns"

export const createBookingSchema=z.object({
    roomId:z.string()
        .uuid(),
    checkIn:z.string()
        .datetime(),
    checkOut:z.string()
        .datetime()
}).refine((data)=>{
    const checkInDate=parseISO(data.checkIn);
    return isBefore(new Date(),checkInDate)
},{
    message:"checkIn date must be in the future",
    path:["checkIn"]
}
).refine((data)=>{
    const checkInDate =parseISO(data.checkIn);
    const checkOutDate=parseISO(data.checkOut);
    return isBefore(checkInDate,checkOutDate)
},{
    message:"checkOut date must be after checkIn date",
    path:["checkOut"]
}
).refine((data)=>{
    const checkInDate =parseISO(data.checkIn);
    const checkOutDate=parseISO(data.checkOut);
    return differenceInDays(checkOutDate,checkInDate)>=1
},{
    message: "Booking must be at least 1 night",
    path: ["checkOut"],
}
)

export type bookingType=z.infer<typeof createBookingSchema>;