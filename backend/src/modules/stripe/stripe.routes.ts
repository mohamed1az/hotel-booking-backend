import { Router, raw } from "express";
import {
  createCheckoutSession,
  stripeWebhook,
} from "./stripe.controller.js";
import { protect } from "../../middlewares/protect.js"; 

const router = Router();

router.post("/create-checkout-session/:bookingId",protect,createCheckoutSession);

router.post("/webhook", stripeWebhook);

export default router;