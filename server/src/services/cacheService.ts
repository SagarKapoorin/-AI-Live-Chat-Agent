import { prisma } from '../lib/prisma.js';
import { redisClient } from '../lib/redis.js';
import { ChatMessage } from '../types/chat.js';
import { CachedMessage, SessionCache } from '../types/cache.js';
import { SESSION_TTL_SECONDS } from '../constants/index.js';

class CacheService {
  private static instance: CacheService;
  private readonly ttlSeconds = SESSION_TTL_SECONDS;
  private constructor(private readonly client = redisClient) {}
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      // console.log("HIT1:", key, value)
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn(`Cache get failed for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = this.ttlSeconds): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } catch (error) {
      console.warn(`Cache set failed for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.warn(`Cache delete failed for key ${key}:`, error);
    }
  }

  private buildSessionKey(sessionId: string): string {
    return `session:${sessionId}:messages`;
  }

  private serializeMessages(messages: ChatMessage[]): CachedMessage[] {
    return messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    }));
  }

  private hydrateMessages(messages: CachedMessage[]): ChatMessage[] {
    return messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: new Date(message.createdAt),
    }));
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const cacheKey = this.buildSessionKey(sessionId);
    const cached = await this.get<SessionCache>(cacheKey);
    if (cached) {
      return this.hydrateMessages(cached.messages);
    }
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    const payload: SessionCache = { sessionId, messages: this.serializeMessages(messages) };
    await this.set<SessionCache>(cacheKey, payload);
    return messages;
  }

  async clearSessionCache(sessionId: string): Promise<void> {
    const cacheKey = this.buildSessionKey(sessionId);
    await this.delete(cacheKey);
  }
}

export const cacheService = CacheService.getInstance();
