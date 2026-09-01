import { validate } from "../../middlewares/validator.js";
import { createBookingSchema } from "./booking.validator.js";
import { protect } from "../../middlewares/protect.js";
import { createBooking ,myBookings ,bookingById, cancelledBooking } from "./booking.controller.js";
import express from "express"
const router=express.Router();


router.post('/',protect,validate(createBookingSchema),createBooking)

router.get('/my-bookings',protect,myBookings)

router.get('/:bookingId',protect,bookingById)
router.patch('/:bookingId',protect,cancelledBooking)

export default router;