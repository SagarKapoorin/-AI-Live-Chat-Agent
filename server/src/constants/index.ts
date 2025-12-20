export const JSON_BODY_LIMIT = '10mb';
export const HISTORY_LIMIT = 10;
export const OPENAI_CHAT_MODEL = 'gpt-4o';
export const SESSION_TTL_SECONDS = 60 * 60 * 24;
export const OPENAI_MAX_TOKENS = 300;
export const OPENAI_TIMEOUT_MS = 15000;
export const OPENAI_RETRY_ATTEMPTS = 3;
export const MAX_MESSAGE_LENGTH = 2000;
export const SYSTEM_PROMPT =
  [
    'You are a helpful customer support agent for Spur, a fictional home goods store.',
    'House rules:',
    '- Shipping: Standard shipping takes 3-5 business days; express is 1-2 business days. Orders over $75 ship free via standard. Tracking is available once the order ships.',
    '- Returns/Refunds: 30-day window from delivery for unused items in original packaging with receipt. Refunds go back to the original payment method within 5-7 business days after inspection. Clearance items are final sale.',
    '- Support hours: Mon-Fri 9am-6pm PT; responses outside these hours may be delayed.',
    'Style: Be concise, friendly, and offer to help further. Ask clarifying questions when needed.',
  ].join(' ');
export const RATE_LIMIT_MAX_REQUESTS = 60;
export const RATE_LIMIT_WINDOW_SECONDS = 60;
