import {prisma} from "../../config/db.js"
import {AppError} from "../../utils/AppError.js"
import { Prisma } from "@prisma/client";
import { addRoomType, updateRoomType } from "./room.validator.js"
import { Request,Response } from "express"

interface userData{
    id:string
    role:string
}

export const addRoomTypeService=async(data:addRoomType,imageUrls:string[],hotelId:string,user:userData)=>{

    const hotel= await prisma.hotel.findUnique({
        where:{
            id:hotelId
        }
    })
    if(!hotel){
        throw new AppError("Hotel not found",404)
    }

    if(user.role!=='ADMIN' && hotel.managerId!==user.id){
        throw new AppError("You do not have permission to add a room type to this hotel",403);
    }
    const existingRoomType = await prisma.roomType.findFirst({
        where: {
            hotelId,
            title: data.title
        }
    });

    if (existingRoomType) {
        throw new AppError("A room type with this title already exists in this hotel", 400);
    }

    const roomType=await prisma.roomType.create({
        data:{
            title:data.title,
            description:data.description?? null,
            pricePerNight:data.pricePerNight,
            capacity:data.capacity,
            images:imageUrls,
            hotelId:hotelId
        }
    })
    return roomType;

}

export const getAllRoomTypeService=async(hotelId:string)=>{
    // const hotel=await prisma.hotel.findUnique({
    //     where:{
    //         id:hotelId
    //     }
    // })
    // if(!hotel){
    //     throw new AppError("Hotel not found",404)
    // }
    
    // const RoomTypes=await prisma.roomType.findMany({
    //     where:{
    //         hotelId:hotelId
    //     }
    // })
    const hotel =await prisma.hotel.findUnique({
        where:{id:hotelId},
        include:{
            roomTypes:{
                include: {
                    _count: { select: { rooms: true } }
                }
            }
        }
    })

    if(!hotel){
        throw new AppError("Hotel not found",404)
    }
    return hotel.roomTypes;
}

export const getRoomTypeByIdService=async(roomTypeId:string)=>{
    const roomType=await prisma.roomType.findUnique({
        where:{id:roomTypeId},
        include:{
             _count:{ select: { rooms: true } }
        }
    })

    if(!roomType){
        throw new AppError("room type not found",404)
    }
    return roomType;
}

export const updatRoomTypeService=async(data:updateRoomType,imageUrls:string[],roomTypeId:string,user:userData)=>{
    const roomType=await prisma.roomType.findUnique({
        where:{id:roomTypeId},
        include:{hotel:true}
    })
    if(!roomType){
        throw new AppError("Room type not found", 404)
    }
    
    if(user.role!=='ADMIN'&&user.id!==roomType.hotel.managerId){
        throw new AppError("You do not have permission to update this room type", 403);
    }

    const updatedRoomType = await prisma.roomType.update({
        where: { id: roomTypeId },
        data: {
            title: data.title,
            description: data.description ?? undefined,
            pricePerNight: data.pricePerNight,
            capacity: data.capacity,
            images: imageUrls.length > 0 ? imageUrls : roomType.images
        }
    })

    return updatedRoomType;

}

export const deleteRoomTypeService=async(roomTypeId:string,user:userData)=>{
    const roomType=await prisma.roomType.findUnique({
        where:{id:roomTypeId},
        include:{hotel:true}
    })
    if(!roomType){
        throw new AppError("room type not found",404)
    };
    if(user.role!=='ADMIN'&&user.id!==roomType.hotel.managerId){
        throw new AppError("You do not have permission to delete this room type", 403)
    }

    const dRoomType=await prisma.roomType.delete({
        where:{
            id:roomTypeId
        }
    })
    return true;
}