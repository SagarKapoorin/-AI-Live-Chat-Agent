export type Role = 'user' | 'ai';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
}

export interface ChatState {
  messages: Message[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ChatResponse {
  sessionId: string;
  message: Message;
}
