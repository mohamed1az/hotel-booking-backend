import {prisma} from "../../config/db.js"
import { bookingType } from "./booking.validator.js"
import {isBefore,parseISO,differenceInDays ,subDays} from "date-fns"
import { AppError } from "../../utils/AppError.js"

interface userData{
    id:string
    role:string
}

export const createBookingService=async(data:bookingType,user:userData)=>{
    const checkInDate = parseISO(data.checkIn);
    const checkOutDate = parseISO(data.checkOut);
    const room= await prisma.room.findUnique({
        where:{id:data.roomId},
        include:{
            roomType:true
        }
    })
    if(!room){
        throw new AppError("room not foun",404)
    }

    if(!room.isAvailable){
        throw new AppError("Room is out of service / Maintenance",400)
    }
    
    const hasOverlap=await prisma.booking.findFirst({
        where:{
            roomId:data.roomId,
            status:{not:"CANCELLED"},
            AND:[{
                checkIn:{lt:checkOutDate}
            },{
                checkOut:{gt:checkInDate}
            }]
        }
    
    });
    if(hasOverlap){
        throw new AppError("Room is already booked for these dates",400);
    }

    const totalPrice=room.roomType.pricePerNight *differenceInDays(checkOutDate,checkInDate)

    const booking=await prisma.booking.create({
        data:{
            roomId:data.roomId,
            checkIn:checkInDate,
            checkOut:checkOutDate,
            totalPrice:totalPrice,
            userId:user.id
        }
    })

    return booking;
}

export const myBookingsService=async(user:userData)=>{
    const bookings=await prisma.booking.findMany({
        where:{userId:user.id},
        orderBy:{createdAt:"desc"},
        include:{
            room:{
                include:{
                    roomType:{
                        include:{
                            hotel:true
                        }
                    }
                }
            }
        }

    })
    if(bookings.length === 0){
        throw new AppError("no booking found",404)
    }
    return bookings;
}

export const bookingByIdService=async(bookingId:string,user:userData)=>{
    const condition = user.role ==='ADMIN'|| user.role==='HOTEL_MANAGER'
    ?{id:bookingId}
    :{id: bookingId, userId: user.id };
    const booking=await prisma.booking.findFirst({
        where:
            // id:bookingId,
            // userId:user.id
            condition
        ,
        include:{
            room:{
                include:{
                    roomType:true
                }
            }
        }
    })
    
    if(!booking){
        throw new AppError("Booking not found",404)
    }

    return booking;
}

export const cancelledBookingService=async(bookingId:string,user:userData)=>{
    const booking= await prisma.booking.findFirst({
        where:{
            id:bookingId,
            status:{not:"CANCELLED"},
            userId:user.id
        }
    })
    if(!booking){
        throw new AppError("booking not found",404)
    }

    const success=isBefore(new Date(),subDays(booking.checkIn,2))

    if(!success){
        throw new AppError("Cannot cancel booking within 48 hours of check-in",400)
    }

    const updatedBooking= await prisma.booking.update({
        where:{id:bookingId},
        data:{
            status:"CANCELLED"
        }
    })

    return updatedBooking;


}