import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(parsed.error.message);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV ?? 'development',
  port: parsed.data.PORT ?? '3000',
  openAiApiKey: parsed.data.OPENAI_API_KEY,
  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
};
