import { addRoom ,getRoomById,updateRoom,deleteRoom,allRoom} from "./room.controller.js"
import { restrictTo } from "../../middlewares/restrictTo.js";
import { roomShcema,updateRoomSchema } from "./room.validator.js";
import { validate } from "../../middlewares/validator.js";
import { protect } from "../../middlewares/protect.js";
import express from "express"
const router=express.Router();


router.post('/:roomTypeId',protect,restrictTo('HOTEL_MANAGER','ADMIN'),validate(roomShcema),addRoom)
router.get('/:roomId',getRoomById)
router.put('/:roomId',protect,restrictTo('HOTEL_MANAGER','ADMIN'),validate(updateRoomSchema),updateRoom)
router.delete('/:roomId',protect,restrictTo('HOTEL_MANAGER','ADMIN'),deleteRoom)
router.get('/room-type/:roomTypeId',allRoom)




export default router;
