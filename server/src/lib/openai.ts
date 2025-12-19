import OpenAI from 'openai';
import { env } from '../config/env.js';

const apiKey: string = env.openAiApiKey;

export const openAiClient = new OpenAI({
  apiKey,
});
