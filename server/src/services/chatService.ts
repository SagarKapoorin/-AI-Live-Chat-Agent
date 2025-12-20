import { MessageRole } from '@prisma/client';
import { openAiClient } from '../lib/openai.js';
import { prisma } from '../lib/prisma.js';
import { SYSTEM_PROMPT } from '../constants/index.js';
import { ChatMessage } from '../types/chat.js';
import {
  HISTORY_LIMIT,
  MAX_MESSAGE_LENGTH,
  OPENAI_CHAT_MODEL,
  OPENAI_MAX_TOKENS,
  OPENAI_RETRY_ATTEMPTS,
  OPENAI_TIMEOUT_MS,
} from '../constants/index.js';
import { cacheService } from './cacheService.js';
import { HttpError } from '../utils/httpError.js';

const toOpenAiRole = (role: MessageRole): 'user' | 'assistant' => {
  return role === MessageRole.USER ? 'user' : 'assistant';
};

const injectionPatterns = [
  /ignore (all )?previous instructions/i,
  /disregard (all )?prior (instructions|context)/i,
  /you are (now|currently) system/i,
  /pretend to be/i,
  /reset system prompt/i,
];

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getStatusCode = (error: unknown): number | null => {
  if (error && typeof error === 'object' && 'status' in error) {
    const candidate = (error as { status?: unknown }).status;
    if (typeof candidate === 'number') {
      return candidate;
    }
  }
  return null;
};

const shouldRetry = (error: unknown): boolean => {
  const status = getStatusCode(error);
  if (status === 429) return true;
  if (status && status >= 500) return true;
  return false;
};

const enforcePromptGuardrails = (message: string): void => {
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(
      400,
      `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      'Message too long',
    );
  }
  const isInjection = injectionPatterns.some((pattern) => pattern.test(message));
  if (isInjection) {
    throw new HttpError(
      400,
      'Please ask a normal support question. System-level instructions are not allowed.',
      'Prompt injection detected',
    );
  }
};

const isContentFlagged = async (content: string): Promise<boolean> => {
  try {
    const moderation = await openAiClient.moderations.create({
      model: 'omni-moderation-latest',
      input: content,
    });
    return moderation.results?.[0]?.flagged ?? false;
  } catch (error) {
    console.warn('Moderation check failed, proceeding without block:', error);
    return false;
  }
};

const withOpenAiRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  let attempt = 0;
  let lastError: unknown;
  while (attempt < OPENAI_RETRY_ATTEMPTS) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt >= OPENAI_RETRY_ATTEMPTS || !shouldRetry(error)) {
        break;
      }
      const backoffMs = 200 * attempt + Math.floor(Math.random() * 100);
      await delay(backoffMs);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new HttpError(503, 'The assistant is unavailable right now. Please try again shortly.');
};

const getOrCreateSession = async (sessionId?: string): Promise<string> => {
  try {
    if (sessionId) {
      const existing = await prisma.session.findUnique({ where: { id: sessionId } });
      if (existing) {
        return existing.id;
      }
    }
    const created = await prisma.session.create({ data: {} });
    return created.id;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to resolve session');
  }
};

const saveMessage = async (
  sessionId: string,
  role: MessageRole,
  content: string,
): Promise<void> => {
  try {
    await prisma.message.create({
      data: { sessionId, role, content },
    });
    await cacheService.clearSessionCache(sessionId);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to persist message');
  }
};

const getRecentMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  try {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    const ordered = messages.reverse();
    return ordered;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to load recent messages');
  }
};

const generateAiReply = async (history: ChatMessage[]): Promise<string> => {
  try {
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...history.map((item) => ({ role: toOpenAiRole(item.role), content: item.content })),
    ];
    const completion = await withOpenAiRetry(() =>
      openAiClient.chat.completions.create(
        {
          model: OPENAI_CHAT_MODEL,
          messages,
          max_tokens: OPENAI_MAX_TOKENS,
          temperature: 0.3,
        },
        { timeout: OPENAI_TIMEOUT_MS },
      ),
    );
    // console.log("OpenAI Completion:", completion);
    const choice = completion.choices[0];
    if (!choice || !choice.message.content) {
      throw new Error('No response from model');
    }
    return choice.message.content;
  } catch (error) {
    const status = getStatusCode(error);
    if (status === 429) {
      throw new HttpError(
        429,
        'The assistant is rate limited. Please try again in a few moments.',
        error instanceof Error ? error.message : 'LLM rate limit',
      );
    }
    if (status && status >= 500) {
      throw new HttpError(
        503,
        'The assistant is having trouble replying right now. Please try again shortly.',
        error instanceof Error ? error.message : 'LLM unavailable',
      );
    }
    throw error instanceof Error
      ? error
      : new HttpError(503, 'The assistant is unavailable right now. Please try again shortly.');
  }
};

export const handleChatMessage = async (
  message: string,
  sessionId?: string,
): Promise<{ reply: string; sessionId: string }> => {
  try {
    enforcePromptGuardrails(message);
    if (await isContentFlagged(message)) {
      throw new HttpError(
        400,
        'Message was rejected for safety reasons. Please rephrase your question.',
      );
    }
    const resolvedSessionId = await getOrCreateSession(sessionId);
    await saveMessage(resolvedSessionId, MessageRole.USER, message);
    const history = await getRecentMessages(resolvedSessionId);
    const aiReply = await generateAiReply(history);
    //console.log("AI Reply:", aiReply,"history:",history);
    await saveMessage(resolvedSessionId, MessageRole.ASSISTANT, aiReply);
    return { reply: aiReply, sessionId: resolvedSessionId };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to handle chat message');
  }
};

export const getSessionHistory = async (sessionId: string): Promise<ChatMessage[]> => {
  try {
    const existing = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!existing) {
      return [];
    }
    const messages = await cacheService.getMessages(sessionId);
    return messages;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch session history');
  }
};
