import { MessageRole } from '@prisma/client/wasm';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}
