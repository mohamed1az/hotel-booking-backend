import { redis } from "../config/redis.js";

export class Cache{

    static async get<T>(key: string): Promise<T | null>{
        try{
            const data = await redis.get(key);
            if(!data) return null;
            return JSON.parse(data) as T;
        }catch(error){
            console.error(`Error reading key "${key}" from Redis:`, error);
            return null;
        }
    }

    static async set(key:string,value:any,ttlSeconds:number=3600):Promise<void>{
        try{
            const stringValue= JSON.stringify(value);
            await redis.set(key,stringValue,'EX',ttlSeconds)
        }catch(error){
            console.error(`Error setting key "${key}" in Redis:`, error);
        }
    }

    static async del(key:string):Promise<void>{
        try{
            await redis.del(key);
        }catch(error){
            console.error(`Error deleting key "${key}" from Redis:`, error);
        }   
    }

    static async delPattern(pattern:string):Promise<void>{
        try{
            const keys=await redis.keys(pattern);
            if(keys.length>0){
                await redis.del(...keys);
            }
        }catch(error){
            console.error(`Error deleting pattern "${pattern}" from Redis:`, error);
        }
    }

    static async remember<T>(key:string,ttlSeconds:number,fetchFunction: () => Promise<T>):Promise<T>{
        const cachedData=await Cache.get<T>(key);
        if (cachedData) return cachedData;
        const freshData =await fetchFunction();
        if(freshData !== null && freshData !== undefined){
            await Cache.set(key,freshData,ttlSeconds)
        } 
        return freshData;
    }

}







