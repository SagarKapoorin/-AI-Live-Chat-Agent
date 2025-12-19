import rateLimit from 'express-rate-limit';
import RedisStore, { type SendCommandFn } from 'rate-limit-redis';
import { redisClient } from '../lib/redis.js';
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS } from '../constants/index.js';

export const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_SECONDS * 1000,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: ((command: string, ...args: string[]) =>
      redisClient.call(command, ...args)) as SendCommandFn,
  }),
});
