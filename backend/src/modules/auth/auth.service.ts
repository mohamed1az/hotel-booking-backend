import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/AppError.js';
import { prisma } from '../../config/db.js';
import {loginType,registerType} from './auth.validator.js'

export const registerService=async(data:registerType)=>{
    const isExist= await prisma.user.findUnique({
        where:{
            email:data.email
        }
    })
    if(isExist){
        throw new AppError("this email already exist",400)
    }
    const hashedPassword=await bcrypt.hash(data.password,10)
    const user = await prisma.user.create({
        data:{
            ...data,
            password:hashedPassword
        },
        select:{
            id:true,
            name:true,
            email:true,
            role:true,
            createdAt:true
        }
    })
    return user;
}

export const loginService=async(data:loginType)=>{
    const {email,password}=data;
    const user= await prisma.user.findUnique({
        where:{
            email:email
        }
    })
    if(!user||!(await bcrypt.compare(password,user.password))){
        throw new AppError("invalid credentials",401)
    }
    const token=jwt.sign(
        {id:user.id, role:user.role},
        process.env.JWT_SECRET as string,
        {expiresIn:'1d'}
    );

    return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  }

}