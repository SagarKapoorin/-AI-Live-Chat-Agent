import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSessionHistory, handleChatMessage } from '../services/chatService.js';
import { MAX_MESSAGE_LENGTH } from '../constants/index.js';
const messageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, { message: 'Message cannot be empty.' })
    .max(MAX_MESSAGE_LENGTH, {
      message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
    }),

  sessionId: z.string().uuid().optional(),
});

const sessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

export const postChatMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const result = await handleChatMessage(parsed.data.message, parsed.data.sessionId);
    //console.log(result);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      next(error);
      return;
    }
    next(new Error('Unknown error'));
  }
};

export const getChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const parsed = sessionParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const history = await getSessionHistory(parsed.data.sessionId);
    //console.log(history);
    res.json({ sessionId: parsed.data.sessionId, history });
  } catch (error) {
    if (error instanceof Error) {
      next(error);
      return;
    }
    next(new Error('Unknown error'));
  }
};
