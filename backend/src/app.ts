import express from "express";
import cors from "cors";
import path from "path"
import authRouter from "./modules/auth/auth.routes.js"
import hotelRouter from "./modules/hotel/hotel.routes.js"
import roomTypeRouter from "./modules/RoomType/roomType.routes.js"
import roomRouter from "./modules/room/room.routes.js"
const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads',express.static(path.join(process.cwd(), "uploads")))
app.use('/api/auth',authRouter)
app.use('/api/hotel',hotelRouter)
app.use('/api/room-types',roomTypeRouter)
app.use('/api/rooms',roomRouter)
export default app;