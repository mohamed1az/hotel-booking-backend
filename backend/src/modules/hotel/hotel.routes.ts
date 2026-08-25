import express from "express";
import {addHotel,removeHotel,getHotels,updateHotel,getHotelById} from "./hotel.controller.js"
import { restrictTo } from "../../middlewares/restrictTo.js";
import { protect } from "../../middlewares/protect.js";
import {addHotelSchema,updateHotelSchema} from "./hotel.validator.js";
import {validate} from "../../middlewares/validator.js"
import { prototype } from "node:events";
const router=express.Router()

router.post('/',protect,restrictTo('HOTEL_MANAGER','ADMIN'),validate(addHotelSchema),addHotel)
router.get('/',getHotels);
router.delete('/:hotelId',protect,restrictTo('HOTEL_MANAGER','ADMIN'),removeHotel)
router.put('/:hotelId',protect,restrictTo('HOTEL_MANAGER','ADMIN'),validate(updateHotelSchema),updateHotel)
router.get('/:hotelId',protect,getHotelById)
export default router;