import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { type Message } from '../types';

const formatTimestamp = (timestamp: string): string =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getBubbleStyles = (role: Message['role']): string =>
  role === 'user'
    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
    : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm';

const getRowAlignment = (role: Message['role']): string =>
  role === 'user' ? 'justify-end' : 'justify-start';

export const ChatWidget = () => {
  const { messages, isLoading, error, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const orderedMessages = useMemo(() => [...messages], [messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [orderedMessages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSend();
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  return (
    <div className="w-full max-w-3xl h-[600px] bg-white border border-gray-200 rounded-2xl shadow-lg flex flex-col">
      <div className="px-5 py-4 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900">AI Support Agent</p>
        <p className="text-xs text-gray-500">Ask questions and get instant guidance.</p>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {orderedMessages.map((message) => (
          <div key={message.id} className={`flex ${getRowAlignment(message.role)}`}>
            <div className={`max-w-[75%] px-4 py-3 ${getBubbleStyles(message.role)}`}>
              <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
              <span className="mt-2 block text-[11px] text-opacity-80">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] px-4 py-3 bg-gray-100 text-gray-600 rounded-2xl rounded-bl-sm text-sm">
              Agent is typing...
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
        {error && (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            <span className="font-semibold">Error:</span>
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="h-11 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
