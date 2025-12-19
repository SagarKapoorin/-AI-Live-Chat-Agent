import { MessageRole } from "@prisma/client/wasm";
import { openAiClient } from "../lib/openai.js";
import { prisma } from "../lib/prisma.js";
import { SYSTEM_PROMPT } from "../constants/index.js";
import { ChatMessage } from "../types/chat.js";
import { HISTORY_LIMIT, OPENAI_CHAT_MODEL } from "../constants/index.js";
import { cacheService } from "./cacheService.js";
const toOpenAiRole = (role: MessageRole): "user" | "assistant" => {
  return role === MessageRole.USER ? "user" : "assistant";
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
    throw new Error("Failed to resolve session");
  }
};

const saveMessage = async (sessionId: string, role: MessageRole, content: string): Promise<void> => {
  try {
    await prisma.message.create({
      data: { sessionId, role, content }
    });
    await cacheService.clearSessionCache(sessionId);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to persist message");
  }
};

const getRecentMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  try {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT
    });
    const ordered = messages.reverse();
    return ordered;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to load recent messages");
  }
};

const generateAiReply = async (history: ChatMessage[]): Promise<string> => {
  try {
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...history.map((item) => ({ role: toOpenAiRole(item.role), content: item.content }))
    ];
    const completion = await openAiClient.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages
    });
    //console.log("OpenAI Completion:", completion);
    const choice = completion.choices[0];
    if (!choice || !choice.message.content) {
      throw new Error("No response from model");
    }
    return choice.message.content;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to generate AI reply");
  }
};

export const handleChatMessage = async (message: string, sessionId?: string): Promise<{ reply: string; sessionId: string }> => {
  try {
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
    throw new Error("Failed to handle chat message");
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
    throw new Error("Failed to fetch session history");
  }
};
