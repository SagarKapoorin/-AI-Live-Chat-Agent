import { Router } from 'express';
import { getChatHistory, postChatMessage } from '../controllers/chatController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const chatRouter = Router();

chatRouter.post('/chat/message', asyncHandler(postChatMessage));
chatRouter.get('/chat/history/:sessionId', asyncHandler(getChatHistory));
