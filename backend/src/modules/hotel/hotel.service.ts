import {prisma} from "../../config/db.js"
import { BookingStatus, Prisma } from "@prisma/client";
import { AppError } from '../../utils/AppError.js';
import {addHotelType,updateHotelType} from "./hotel.validator.js"
import { Request,Response } from "express";
import { Cache } from "../../utils/cache.js";

interface userData{
    id:string
    role:string
}
interface GetHotelsParams {
    page: number;
    limit: number;
    search?: string;
    checkIn?:string;
    checkOut?:string
}

export const createHotelService=async(data:addHotelType,imageUrls:string[],managerId:string)=>{
    const isExist= await prisma.hotel.findFirst({
        where:{
            name:data.name,
            address:data.address
        }
    })    
    if(isExist){
        throw new AppError("A hotel with this name and address already exists", 400);
    }
    const hotel=await prisma.hotel.create({
        data:{
            name:data.name,
            address:data.address,
            images:imageUrls,
            managerId
        }
    });
    
    await Cache.delPattern(`hotels:all:*`)
    
    return hotel;
}

export const deleteHotelService=async(hotelId:string,user:userData)=>{
    const cacheKey=`hotel:${hotelId}`
    const isExist = await prisma.hotel.findUnique({
            where:{
                id:hotelId
            }
        });

    if(!isExist){
        throw new AppError("hotel not found",404)
    }
    if(user.role!=='ADMIN' && isExist.managerId!==user.id){
        throw new AppError("You do not have permission to delete this hotel", 403);
    }
    const hotel= await prisma.hotel.delete({
        where:{
            id:hotelId
        }
    })
    await Promise.all([
        Cache.del(cacheKey),
        Cache.delPattern('hotels:all:*')
    ])
    return true
}

export const getAllHotelService=async({page,limit,search,checkIn,checkOut}:GetHotelsParams)=>{
    const skip=(page-1)*limit;
    const where :any ={};
    if(search) {
        where.OR=[
            { name: { contains: search, mode: 'insensitive' as const } },
            { address: { contains: search, mode: 'insensitive' as const } }
        ]
    } 
    if (checkIn && checkOut){
        const isRoomAvailable={
            isAvailable:true,
            bookings:{
                none:{
                    status:{in:[BookingStatus.CONFIRMED,BookingStatus.PENDING]},
                    AND:[
                        {checkIn:{lt:new Date(checkOut)}},
                        {checkOut:{gt:new Date(checkIn)}}
                    ]
                }
            }
        }
        where.roomType={
            some:{
                rooms:{some:isRoomAvailable}
            }
        }
    }
    
    const cacheKey=`hotels:all:page=${page}:limit=${limit}:search=${search || ''}:checkIn=${checkIn || ''}:checkOut=${checkOut || ''}`;

    return  await Cache.remember(cacheKey,600,async()=>{
        const [hotels,totalHotels]= await Promise.all([
            prisma.hotel.findMany({
                where,
                skip,
                take:limit,
                orderBy: { createdAt: 'desc' }
            }),
             prisma.hotel.count({where})
        ])
        const totalPages = Math.ceil(totalHotels / limit);
        return {
            hotels,
            pagination: {
                totalHotels,
                totalPages,
                currentPage: page,
                limit
            }
        }
        
    });
  
};

export const updateHotelService=async(data:Prisma.HotelUpdateInput,imagesUrls:string[]|undefined,hotelId:string,user:userData)=>{
    const hotel= await prisma.hotel.findUnique({
        where:{
            id:hotelId,
        }
    })

    if(!hotel){
        throw new AppError("Hotel not found", 404);
    }

    if (user.role !== 'ADMIN' && hotel.managerId !== user.id) {
        throw new AppError("You do not have permission to update this hotel", 403);
    }

    let finalImages=hotel.images;
    if(imagesUrls && imagesUrls.length>0){
        finalImages = imagesUrls;
    }

    const updatedHotel=await prisma.hotel.update({
        where:{
            id:hotelId,
        },
        data:{
            ...data,
            images:finalImages
        }
    })
    return updatedHotel;
}

export const getHotelByIdService = async (hotelId: string) => {
    const cacheKey=`hotel:${hotelId}`;
    return await Cache.remember(cacheKey,600,async ()=>{
        return await prisma.hotel.findUnique({
        where: {
            id: hotelId
        },
        include: {
            manager:{
                select:{
                    id:true,
                    name:true,
                    email:true
                }
            },
            roomTypes:{
                include:{
                    _count:{
                        select: { rooms: true }
                    }
                }
            }
        }
    });
    })
     
};