import express from "express";
import cors from "cors";
import path from "path";
import authRouter from "./modules/auth/auth.routes.js";
import hotelRouter from "./modules/hotel/hotel.routes.js";
import roomTypeRouter from "./modules/RoomType/roomType.routes.js";
import roomRouter from "./modules/room/room.routes.js";
import bookingRouter from "./modules/booking/booking.routes.js";
import stripeRouter from "./modules/stripe/stripe.routes.js"; // 1. استيراد راوتر Stripe
import { globalLimiter , authLimiter } from "./middlewares/rateLimiter.js";
const app = express();

app.use(cors());

app.use(globalLimiter);

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.use('/uploads', express.static(path.join(process.cwd(), "uploads")));

app.use('/api/auth',authLimiter, authRouter);
app.use('/api/hotel', hotelRouter);
app.use('/api/room-types', roomTypeRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', stripeRouter); 

export default app;