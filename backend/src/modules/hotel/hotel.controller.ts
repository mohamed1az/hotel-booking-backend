import { Request,Response } from "express"
import { AppError } from "../../utils/AppError.js"
import {createHotelService,deleteHotelService,getAllHotelService,updateHotelService,getHotelByIdService} from "./hotel.service.js"
import { asyncHandler } from "../../middlewares/asyncHandler.js"
import multer from "multer"

export const addHotel=asyncHandler(async(req:Request,res:Response)=>{
    const managerId=(req as any).user.id;
    const files = req.files as Express.Multer.File[];
    const imageUrls=files?.map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    )|| [];
    const hotel=await createHotelService(req.body,imageUrls,managerId);
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
    const checkIn = req.query.checkIn as string;
    const checkOut=req.query.checkOut as string;
    const result= await getAllHotelService({page,limit,search, checkIn, checkOut});

    res.status(200).json({
        status:"success",
        data:result
    })
})

export const updateHotel=asyncHandler(async(req:Request,res:Response)=>{
    const hotelId=(req as any).params.hotelId;
    const user=(req as any).user;
    const files=req.files as Express.Multer.File[];
    const imageUrls=files?.map(
        file=>`${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    )
    const hotel= await updateHotelService(req.body,imageUrls,hotelId,user);
    res.status(200).json({
        status:"success",
        data:{hotel}
    })
})

export const getHotelById=asyncHandler(async(req:Request,res:Response)=>{
    const hotelId=(req as any).params.hotelId;
    const hotel=await getHotelByIdService(hotelId)
    if(hotel===null){
        throw new AppError('hotel not found',404)
    }
    res.status(200).json({
        status:"success",
        data:{hotel}
    })
})
