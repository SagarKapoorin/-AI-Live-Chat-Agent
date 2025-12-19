import { Redis } from 'ioredis';
import { env } from '../config/env.js';

const redisClient = new Redis(env.redisUrl, {
  lazyConnect: true,
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});

redisClient.on('error', (error: unknown) => {
  console.warn('Redis error encountered:', error);
});

export { redisClient };
