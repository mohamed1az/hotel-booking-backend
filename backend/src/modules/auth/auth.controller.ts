import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { registerService ,loginService} from "./auth.service.js";


export const register=asyncHandler(async(req:Request,res:Response)=>{
    const user=await registerService(req.body);
    res.status(201).json({
        status: "success",
        data: { user },
    });

})

export const login=asyncHandler(async(req:Request,res:Response)=>{
    const data=await loginService(req.body);
    res.status(200).json({
        status:"success",
        data:data
    })
})