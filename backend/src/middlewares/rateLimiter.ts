import { redis } from "../config/redis.js";
import {rateLimit} from "express-rate-limit";
import {RedisStore} from "rate-limit-redis";


export const globalLimiter =  rateLimit({
    windowMs:15 * 60 * 1000 ,
    limit:100,
    message:{
        status:429,
        error:"Too Many Requests",
        message:"Too many requests"
    },
    standardHeaders:true,
    legacyHeaders:false,
    store : new RedisStore({
        prefix:"rl:global:",
        //@ts-ignore
        sendCommand:(...args:string[])=>redis.call(...args)
    })

})

export const authLimiter = rateLimit({
    windowMs:60*60*1000,
    limit:10,
    message:{
        status:429,
        errot:"Too Many Requests",
        message:"Too many requests"
    },
    store: new RedisStore({
        prefix:"rl:auth:",
        //@ts-ignore
        sendCommand:(...args:string[]) => redis.call(...args)
    })
})


