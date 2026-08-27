import {prisma} from "../../config/db.js"
import {roomSchemaType,updateRoomSchemaType} from "./room.validator.js"
import { AppError } from "../../utils/AppError.js"
interface userData{
    id:string
    role:string
}

export const addRoomService=async(data:roomSchemaType,roomTypeId:string,user:userData)=>{
    
    const roomType=await prisma.roomType.findUnique({
        where:{id:roomTypeId},
        include:{hotel:true}
    })

    if(!roomType){
        throw new AppError("room type not found",404)
    }

    if(user.role!=='ADMIN' && roomType.hotel.managerId!==user.id){
        throw new AppError("You do not have permission to add a room to this room type",403);
    }

    
    const isExist= await prisma.room.findFirst({
        where:{
           roomTypeId:roomTypeId,
           roomNumber:data.roomNumber
        }
    })

    if(isExist){
        throw new AppError("this room already exist",400)
    }
    
    
    const room=await prisma.room.create({
        data:{
            roomNumber:data.roomNumber,
            isAvailable:data.isAvailable,
            roomTypeId:roomTypeId
        }
    })

    return room;

}

export const getRoomByIdService=async(roomId:string)=>{
    const room= await prisma.room.findUnique({
        where:{id:roomId},
        include:{
            roomType:{
                include:{
                    hotel:true
                }
            }
        }
    })
    
    if(!room){
        throw new AppError("room not found",404)
    }
    return room
}

export const updateRoomService=async(data:updateRoomSchemaType,roomId:string,user:userData)=>{
    const room= await prisma.room.findUnique({
        where:{id:roomId},
        include:{
            roomType:{
                include:{
                    hotel:true
                }
            }
        }
    })
    if(!room){
        throw new AppError("room not found",404)
    }
    if(user.role!=='ADMIN' && user.id!==room.roomType.hotel.managerId){
        throw new AppError("You do not have permission to update this room",403)
    }

    if(data.roomNumber && data.roomNumber!==room.roomNumber){
        const isExist = await prisma.room.findFirst({
            where: {
                roomTypeId: room.roomTypeId,
                roomNumber: data.roomNumber
            }
        });
        if(isExist){
            throw new AppError("Room number already exists in this room type", 409);
        }
    }

    const updatedRoom=await prisma.room.update({
        where:{id:roomId},
        data:{...data}
    })
    return updatedRoom;
}

export const deleteRoomService=async(roomId:string,user:userData)=>{
    const room=await prisma.room.findUnique({
        where:{id:roomId},
        include:{
            roomType:{
                include:{
                    hotel:true
                }
            }
        }
    });
    if(!room){
        throw new AppError("room not found",404)
    }

    if(user.role!=='ADMIN' && user.id!==room.roomType.hotel.managerId){
        throw new AppError("You do not have permission to delete this room",403)
    }

    const deleatedRoom=await prisma.room.delete({
        where:{id:roomId}
    })
    return true;
}

export const allRoomService=async(roomTypeId:string,isAvailable:string|undefined)=>{
   const whereClause:any={roomTypeId}
   
    if(isAvailable!== undefined){
        whereClause.isAvailable=isAvailable==='true'
    }

    const rooms = await prisma.room.findMany({
        where:whereClause
    })

    return rooms;
}


