import { redis } from "./redis.js";
import Redlock from 'redlock';



export const redlock = new Redlock(
    [redis],
    {
        retryCount: 10,
        retryDelay: 200, 
        retryJitter: 200,
    }
);
redlock.on('error', (err:Error) => {
  
  console.error('Redlock Error:', err.message);
});

