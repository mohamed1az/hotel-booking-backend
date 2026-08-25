import express from "express";
import cors from "cors";
import authRouter from "./modules/auth/auth.routes.js"
import hotelRouter from "./modules/hotel/hotel.routes.js"
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',authRouter)
app.use('/api/hotel',hotelRouter)

export default app;