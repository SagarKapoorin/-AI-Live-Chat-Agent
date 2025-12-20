import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ChatHistoryResponse,
  ChatResponse,
  ChatState,
  Message,
  ServerMessage,
  ServerRole,
} from '../types';

const storageKey = 'chat-session-id';
const apiBase = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? '';
const normalizedBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;

const buildUrl = (path: string): string => `${normalizedBase}${path}`;

const getStoredSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(storageKey);
  return stored || null;
};

const persistSessionId = (sessionId: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey, sessionId);
};

const toClientRole = (role: ServerRole): Message['role'] =>
  role === 'USER' ? 'user' : 'ai';

const mapServerMessage = (message: ServerMessage): Message => ({
  id: message.id,
  role: toClientRole(message.role),
  content: message.content,
  timestamp: new Date(message.createdAt).toISOString(),
});

const createMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    sessionId: getStoredSessionId(),
    isLoading: false,
    error: null,
  });
  const [hasFetchedHistory, setHasFetchedHistory] = useState(false);

  const readErrorMessage = useCallback(async (response: Response): Promise<string> => {
      const data = (await response.json()) as unknown;
      if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
        return data.error;
      }
    if (response.status === 429) return 'Too many requests. Please try again in a moment.';
    return 'Something went wrong while talking to the server.';
  }, []);

  useEffect(() => {
    const loadHistory = async (sessionId: string): Promise<void> => {
      try {
        const response = await fetch(buildUrl(`/api/chat/history/${sessionId}`));
        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }
        const data: ChatHistoryResponse = await response.json();
        const mapped = data.history.map(mapServerMessage);
        setState((prev) => ({
          ...prev,
          messages: mapped,
          sessionId: data.sessionId,
        }));
        setHasFetchedHistory(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load chat history.';
        setState((prev) => ({
          ...prev,
          error: message,
        }));
        setHasFetchedHistory(true);
      }
    };

    if (state.sessionId && !hasFetchedHistory) {
      void loadHistory(state.sessionId);
    }
  }, [state.sessionId, hasFetchedHistory, readErrorMessage]);

  const orderedMessages = useMemo(() => state.messages, [state.messages]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const trimmed = content.trim();
      if (!trimmed || state.isLoading) return;

      const userMessage: Message = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        error: null,
        isLoading: true,
      }));

      try {
        const payload: { message: string; sessionId?: string } = { message: trimmed };
        if (state.sessionId) {
          payload.sessionId = state.sessionId;
        }

        const response = await fetch(buildUrl('/api/chat/message'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        const data: ChatResponse = await response.json();
        const nextSessionId = data.sessionId || state.sessionId;
        const aiMessage: Message = {
          id: createMessageId(),
          role: 'ai',
          content: data.reply,
          timestamp: new Date().toISOString(),
        };

        if (nextSessionId && nextSessionId !== state.sessionId) {
          persistSessionId(nextSessionId);
        }

        setState((prev) => ({
          messages: [...prev.messages, aiMessage],
          sessionId: nextSessionId ?? prev.sessionId,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Something went wrong while sending your message.';
        const errorBubble: Message = {
          id: createMessageId(),
          role: 'ai',
          content: message,
          timestamp: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, errorBubble],
          isLoading: false,
          error: message,
        }));
      }
    },
    [state.isLoading, state.sessionId, readErrorMessage]
  );

  return {
    ...state,
    messages: orderedMessages,
    sendMessage,
  };
};
