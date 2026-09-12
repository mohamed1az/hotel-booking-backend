import {prisma} from "../../config/db.js"
import {roomSchemaType,updateRoomSchemaType} from "./room.validator.js"
import { AppError } from "../../utils/AppError.js"
import { Cache } from "../../utils/cache.js"
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

    await Promise.all([
        Cache.delPattern(`rooms:roomType:${roomTypeId}:*`),
        Cache.delPattern(`roomTypes:hotel:${roomType.hotelId}:*`)
    ])

    return room;

}

export const getRoomByIdService=async(roomId:string)=>{
    const cacheKey=`room:${roomId}`
    
    const room = await Cache.remember(cacheKey,600,async()=>{
        const result = await prisma.room.findUnique({
            where:{id:roomId},
            include:{
                roomType:{
                    include:{
                        hotel:true
                    }
                }
            }
        })

        if(!result){
            throw new AppError("room not found",404)
        }
        return result;
    }) 
    
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

    await Promise.all([
        Cache.del(`room:${roomId}`),
        Cache.delPattern(`rooms:roomType:${room.roomTypeId}:*`),
        Cache.delPattern(`roomTypes:hotel:${room.roomType.hotelId}:*`)
    ])

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
    await Promise.all([
        Cache.del(`room:${roomId}`),
        Cache.delPattern(`rooms:roomType:${room.roomTypeId}:*`),
        Cache.delPattern(`roomTypes:hotel:${room.roomType.hotelId}:*`)
    ])

    return true;
}

export const allRoomService=async(roomTypeId:string,isAvailable:string|undefined)=>{
   const whereClause:any={roomTypeId}
   
    if(isAvailable!== undefined){
        whereClause.isAvailable=isAvailable==='true'
    }

    const cacheKey=`rooms:roomType:${roomTypeId}:available:${isAvailable ?? 'all'}`

    const rooms =await Cache.remember(cacheKey,600,async()=>{
        const result= await prisma.room.findMany({
            where:whereClause
        })
        if(result.length === 0){
            throw new AppError("no room found",404)
        }
        return result;
    }) 

    return rooms;
}


