import { Request,Response } from "express"
import { AppError } from "../../utils/AppError.js"
import {createHotelService,deleteHotelService,getAllHotelService,updateHotelService,getHotelByIdService} from "./hotel.service.js"
import { asyncHandler } from "../../middlewares/asyncHandler.js"

export const addHotel=asyncHandler(async(req:Request,res:Response)=>{
    const managerId=(req as any).user.id;
    const hotel=await createHotelService(req.body,managerId);
    res.status(201).json({
        status:"success",
        data:{hotel}
    })
})

export const removeHotel=asyncHandler(async(req:Request,res:Response)=>{
    const hotelId=(req as any).params.hotelId;
    const user =(req as any).user;
    const success=await deleteHotelService(hotelId,user);
    if(success){
        res.status(204).send();
    }
})

export const getHotels=asyncHandler(async(req:Request,res:Response)=>{
    const page=Number(req.query.page)||1
    const limit=Number(req.query.limit)||8
    const search = req.query.search as string;
    const result= await getAllHotelService({page,limit,search});

    res.status(200).json({
        status:"success",
        data:result
    })
})

export const updateHotel=asyncHandler(async(req:Request,res:Response)=>{
    const hotelId=(req as any).params.hotelId;
    const user=(req as any).user;
    const hotel= await updateHotelService(req.body,hotelId,user);
    res.status(200).json({
        status:"success",
        data:{hotel}
    })
})

export const getHotelById=asyncHandler(async(req:Request,res:Response)=>{
    const hotelId=(req as any).params.hotelId;
    const hotel=await getHotelByIdService(hotelId)
    res.status(200).json({
        status:"success",
        data:{hotel}
    })
})
