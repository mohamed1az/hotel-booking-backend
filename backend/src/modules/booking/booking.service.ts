import {prisma} from "../../config/db.js"
import { bookingType } from "./booking.validator.js"
import {isBefore,parseISO,differenceInDays ,subDays} from "date-fns"
import { AppError } from "../../utils/AppError.js"
import { Cache } from "../../utils/cache.js"
import { redlock } from "../../config/redlock.js"

interface userData{
    id:string
    role:string
}

export const createBookingService=async(data:bookingType,user:userData)=>{
    const checkInDate = parseISO(data.checkIn);
    const checkOutDate = parseISO(data.checkOut);
    const lockKey=`locks:room:${data.roomId}`
    let lock;
    try{
        lock=await redlock.acquire([lockKey],5000)

    }catch(err){
        throw new AppError("High demand on this room, please try again in a moment", 429);
    }
    try{

            
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

        await Promise.all([
            Cache.del(`user:bookings:${user.id}`),
            Cache.delPattern(`rooms:roomType:${room.roomTypeId}:*`),
            Cache.delPattern(`roomTypes:hotel:${room.roomType.hotelId}:*`)
        ])

        return booking;
    }finally{
        if (lock) {
            await lock.unlock().catch((err:Error) => {
                console.error("Failed to release lock:", err.message);
            });
        }
    }
}

export const myBookingsService=async(user:userData)=>{
    const cacheKey=`user:bookings:${user.id}`
    const bookings= await Cache.remember(cacheKey,600,async()=>{
        const result = await prisma.booking.findMany({
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
        return result;
    })
    
    return bookings;
}

export const bookingByIdService=async(bookingId:string,user:userData)=>{
    const cacheKey=`booking:${bookingId}`
    
    const booking= await Cache.remember(cacheKey,600,async()=>{
        const result=await prisma.booking.findFirst({
            where:{id:bookingId},
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
        if(!result){
            throw new AppError("Booking not found",404)
        }
        return result;
    }) 

    const isOwner=booking.userId===user.id;
    const isAdmin=user.role==="ADMIN";
    const isHotelManager=booking.room.roomType.hotel.managerId===user.id && user.role==="HOTEL_MANAGER";
    if(!isAdmin && !isOwner && !isHotelManager){
        throw new AppError("You do not have permission to view this booking", 403)
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
        },
        include:{
            room:{
                include:{
                    roomType:{
                        include:{hotel:true}
                    }
                }
            }
        }
    })

    await Promise.all([
        Cache.del(`booking:${bookingId}`),
        Cache.del(`user:bookings:${updatedBooking.userId}`),
        Cache.delPattern(`rooms:roomType:${updatedBooking.room.roomTypeId}:*`),
        Cache.delPattern(`roomTypes:hotel:${updatedBooking.room.roomType.hotelId}:*`)    
    ])

    return updatedBooking;


}