import {
    addRoomTypeService,getAllRoomTypeService,
    getRoomTypeByIdService,updatRoomTypeService,
    deleteRoomTypeService
} from "./roomType.service.js"
import { Request,Response} from "express"
import { asyncHandler} from "../../middlewares/asyncHandler.js"
import {AppError} from "../../utils/AppError.js"
import multer from "multer"



export const addRoomType=asyncHandler(async(req:Request,res:Response)=>{
    const user=(req as any).user;
    const hotelId=(req as any).params.hotelId;
    const files=req.files as Express.Multer.File[];
    const imageUrls=files?.map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    )|| [];
    const roomType=await addRoomTypeService(req.body,imageUrls,hotelId,user);
    res.status(201).json({
        status:"success",
        data:{roomType}
    })
})

export const getAllRoomType=asyncHandler(async(req:Request,res:Response)=>{
    const hotelId=(req as any).params.hotelId;
    const roomsType=await getAllRoomTypeService(hotelId);
    
    res.status(200).json({
        status:"success",
        data:{roomsType}
    })
})

export const getRoomTypeById=asyncHandler(async(req:Request,res:Response)=>{
    const roomTypeId=(req as any).params.roomTypeId;
    const roomType=await getRoomTypeByIdService(roomTypeId);
    res.status(200).json({
        status:"success",
        data:{roomType}
    })
})

export const updateRoomType=asyncHandler(async(req:Request,res:Response)=>{
    const roomTypeId=(req as any).params.roomTypeId;
    const user=(req as any).user;
    const files= req.files as Express.Multer.File[];
    const imageUrls=files?.map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    )|| [];
    const updatedRoomType=await updatRoomTypeService(req.body,imageUrls,roomTypeId,user);
    res.status(200).json({
        status:"success",
        data:{updatedRoomType}
    })
})

export const deleteRoomType=asyncHandler(async(req:Request,res:Response)=>{
    const user=(req as any ).user;
    const roomTypeId=(req as any).params.roomTypeId;
    const success=await deleteRoomTypeService(roomTypeId,user);
    if(success){
        res.status(204).send();
    }
})
