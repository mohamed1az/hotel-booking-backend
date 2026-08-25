import {prisma} from "../../config/db.js"
import { Prisma } from "@prisma/client";
import { AppError } from '../../utils/AppError.js';
import {addHotelType,updateHotelType} from "./hotel.validator.js"
import { Request,Response } from "express";

interface userData{
    id:string
    role:string
}
interface GetHotelsParams {
    page: number;
    limit: number;
    search?: string;
}

export const createHotelService=async(data:addHotelType,managerId:string)=>{
    const isExist=await prisma.hotel.findFirst({
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
            ...data,
            managerId
        }
    });
    return hotel;
}

export const deleteHotelService=async(hotelId:string,user:userData)=>{
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
    return true
}

export const getAllHotelService=async({page,limit,search}:GetHotelsParams)=>{
    const skip=(page-1)*limit;
    const where = search ? {
        OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { address: { contains: search, mode: 'insensitive' as const } }
        ]
    } : {};
    const hotels=await prisma.hotel.findMany({
        where,
        skip,
        take:limit,
        orderBy: { createdAt: 'desc' }
    })

    const totalHotels= await prisma.hotel.count({where})
    const totalPages = Math.ceil(totalHotels / limit);
    return {
        hotels,
        pagination: {
            totalHotels,
            totalPages,
            currentPage: page,
            limit
        }
    };
    
};

export const updateHotelService=async(data:Prisma.HotelUpdateInput,hotelId:string,user:userData)=>{
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

    const updatedHotel=await prisma.hotel.update({
        where:{
            id:hotelId,
        },
        data: data
    })
    return updatedHotel;
}

export const getHotelByIdService = async (hotelId: string) => {
    const hotel = await prisma.hotel.findUnique({
        where: {
            id: hotelId
        },
        include: {
            rooms: true 
        }
    });

    if (!hotel) {
        throw new AppError("Hotel not found", 404);
    }

    return hotel;
};