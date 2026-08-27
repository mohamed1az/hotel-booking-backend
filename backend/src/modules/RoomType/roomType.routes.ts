import express from "express"
import {addRoomType,getAllRoomType,
    getRoomTypeById,updateRoomType,
    deleteRoomType
} from "./roomType.controller.js"
import { validate } from "../../middlewares/validator.js";
import {RoomTypeSchema,updatRoomTypeSchema} from "./roomType.validator.js"
import {upload} from "../../middlewares/upload.js"
import { restrictTo } from "../../middlewares/restrictTo.js";
import { protect } from "../../middlewares/protect.js";
const router=express.Router()

router.post('/hotel/:hotelId',protect,restrictTo('HOTEL_MANAGER','ADMIN'),upload.array('images',5),validate(RoomTypeSchema),addRoomType);
router.get('/hotel/:hotelId',getAllRoomType)
router.get('/:roomTypeId',getRoomTypeById)
router.put('/:roomTypeId',protect,restrictTo('HOTEL_MANAGER','ADMIN'),upload.array('images',5),validate(updatRoomTypeSchema),updateRoomType)
router.delete('/:roomTypeId',protect,restrictTo('HOTEL_MANAGER','ADMIN'),deleteRoomType)


export default router;