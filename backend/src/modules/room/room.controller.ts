import {addRoomService,getRoomByIdService,
    updateRoomService,deleteRoomService,
    allRoomService
} from "./room.service.js"
import { Request,Response } from "express"
import { AppError } from "../../utils/AppError.js"
import { asyncHandler } from "../../middlewares/asyncHandler.js"

export const addRoom=asyncHandler(async(req:Request,res:Response)=>{
    const roomTypeId=(req as any).params.roomTypeId;
    const user=(req as any).user;
    const room=await addRoomService(req.body,roomTypeId,user);
    res.status(201).json({
        status:"success",
        data:{
            room
        }
    })
})

export const getRoomById=asyncHandler(async(req:Request,res:Response)=>{
    const roomId= (req as any).params.roomId;
    const room= await getRoomByIdService(roomId);
    res.status(200).json({
        status:"success",
        data:{room}
    })
})

export const updateRoom=asyncHandler(async(req:Request,res:Response)=>{
    const roomId=(req as any).params.roomId;
    const user=(req as any).user
    const newRoom=await updateRoomService(req.body,roomId,user);
    res.status(200).json({
        status:"success",
        data:newRoom
    })
})

export const deleteRoom=asyncHandler(async(req:Request,res:Response)=>{
    const user=(req as any).user;
    const roomId=(req as any).params.roomId;
    const success= await deleteRoomService(roomId,user)
    if(success){
        res.status(204).send();
    }
})

export const allRoom=asyncHandler(async(req:Request,res:Response)=>{
    const roomTypeId=(req as any).params.roomTypeId;
    const isAvailable=req.query.isAvailable as string;

    const rooms=await allRoomService(roomTypeId,isAvailable)
    res.status(200).json({
        data:rooms
    })
    
})

