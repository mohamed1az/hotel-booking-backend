import { Request,Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import {
    createBookingService,myBookingsService,
    bookingByIdService ,cancelledBookingService
} from "./booking.service.js"

export const createBooking=asyncHandler(async(req:Request,res:Response)=>{
    const user=(req as any).user;
    const booking=await createBookingService(req.body,user);

    res.status(201).json({
        status:"success",
        data:booking
    })
})

export const myBookings=asyncHandler(async(req:Request,res:Response)=>{
    const user=(req as any).user;
    const bookings = await myBookingsService(user)
    res.status(200).json({
        status:"success",
        data:bookings
    })
})

export const bookingById=asyncHandler(async(req:Request,res:Response)=>{
    const bookingId=(req as any).params.bookingId;
    const user=(req as any).user;
    const booking = await bookingByIdService(bookingId,user)

    res.status(200).json({
        status:"success",
        data:booking
    })
})

export const cancelledBooking=asyncHandler(async(req:Request,res:Response)=>{
    const bookingId=(req as any).params.bookingId;
    const user=(req as any).user;
    const updatedBooking=await cancelledBookingService(bookingId,user);
    res.status(200).json({
        status:"success",
        data:updatedBooking
    })
})












