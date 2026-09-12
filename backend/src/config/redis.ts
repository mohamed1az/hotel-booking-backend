import { Redis } from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 2,
  commandTimeout: 3000,
  connectTimeout: 10000,
  keepAlive: 10000,
  retryStrategy(times) {
    return Math.min(times * 50, 2000); 
  },
});

redis.on('ready', () => console.log('Redis ready '));

redis.on('close', () => console.warn('Redis connection closed, reconnecting...'));

redis.on('error', (err: any) => {
  if (err?.code === 'ECONNRESET') return;
  console.error('Redis error:', err.message);
});

