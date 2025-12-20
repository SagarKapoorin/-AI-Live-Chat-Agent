export type Role = 'user' | 'ai';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
}

export type ServerRole = 'USER' | 'ASSISTANT';

export interface ServerMessage {
  id: string;
  role: ServerRole;
  content: string;
  createdAt: string;
}

export interface ChatState {
  messages: Message[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
}

export interface ChatHistoryResponse {
  sessionId: string;
  history: ServerMessage[];
}
