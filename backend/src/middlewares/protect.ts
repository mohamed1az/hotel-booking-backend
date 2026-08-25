import jwt  from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";
import { prisma } from '../config/db.js';
import { Request,Response,NextFunction } from "express";
import { asyncHandler } from "./asyncHandler.js";

interface JwtPayload {
  id: string;
  role: string;
}
export const protect =asyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
    const authHeader=req.headers.authorization;
    if(!authHeader||!authHeader.startsWith('Bearer ')){
        throw new AppError("authetication token required",401);
    }
    const token=authHeader.split(' ')[1];
    if (!token) {
        throw new AppError("Authentication token required", 401);
    }
    const decoded=jwt.verify(token,process.env.JWT_SECRET as string) as JwtPayload;
    const user=await prisma.user.findUnique({
        where:{
            id:decoded.id
        },
        select:{
            id:true,
            name:true,
            email:true,
            role:true
        }
    });
    if (!user) {
      throw new AppError("User belonging to this token no longer exists", 401);
    }
    (req as any).user = user;
    next()

})