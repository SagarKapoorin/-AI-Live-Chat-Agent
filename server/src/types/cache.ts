import { MessageRole } from "@prisma/client/wasm";

export interface CachedMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface SessionCache {
  sessionId: string;
  messages: CachedMessage[];
}
