import {createCheckoutSessionService , handleWebhookService} from "./stripe.service.js"
import { AppError } from "../../utils/AppError.js"
import { asyncHandler } from "../../middlewares/asyncHandler.js"
import { Request,Response } from "express"
import {stripe} from "../../config/stripe.js"

export const createCheckoutSession=asyncHandler(async(req:Request,res:Response)=>{
    const user = (req as any).user;
    const bookingId = (req as any).params.bookingId;
    const session = await createCheckoutSessionService(bookingId,user);

    res.status(200).json({ status: "success", url: session.url })
})

export const stripeWebhook=asyncHandler(async(req: Request, res: Response)=>{
    const sig=req.headers["stripe-signature"];
    if (!sig) {
      throw new AppError("Missing Stripe signature header", 400);
    }
    const result = await handleWebhookService(req.body, sig as string);
    res.status(200).json(result);
})




