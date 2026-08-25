import express from "express"
import {register,login} from "./auth.controller.js"
import {validate} from "../../middlewares/validator.js"
import { loginSchema,registerSchema } from "./auth.validator.js";
const router =express.Router();

router.post('/register',validate(registerSchema),register)
router.post('/login',validate(loginSchema),login)

export default router;