# Spur AI Chat Support — Backend

A boring, reliable, and type-safe backend for powering Spur's AI customer support chat, built with Express, TypeScript, PostgreSQL, Redis, Prisma, and OpenAI.

## Prerequisites
- Node.js 20+ with npm
- PostgreSQL 14+ running and reachable via `DATABASE_URL`
- Redis 6+ running and reachable via `REDIS_URL`
- An OpenAI API key

## Quick Start (Local Dev)
1. `cd server`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in values (PostgreSQL, Redis, OpenAI).
4. Start Postgres and Redis locally (or point the URLs to hosted instances).
5. Run migrations: `npm run prisma:migrate` (also generates the Prisma client).
6. Build and start: `npm run build && npm start`  
   - For quick runs without watch: `npm run dev` (builds then runs the compiled server).
7. The API is served at `http://localhost:${PORT || 3000}/api`.

## Environment Variables
| Name | Required | Description | Default |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string | — |
| `REDIS_URL` | Yes | Redis connection string | — |
| `OPENAI_API_KEY` | Yes | OpenAI API key used by the chat completion client | — |
| `PORT` | No | Port for the Express server | `3000` |

## API Documentation
### POST `/api/chat/message`
Send a chat message to the AI assistant. If no `sessionId` is provided, a new chat session is created.

**Request Body**
```json
{
  "message": "Where is my order?",
  "sessionId": "a2d53b48-6c1e-4f62-9b50-3bc6b59adbb4"
}
```
- `message` (string, required): User message text.
- `sessionId` (UUID, optional): Existing session identifier. When omitted, a new session is created and returned.

**Response**
```json
{
  "reply": "Your order is on the way and should arrive in 3-5 business days.",
  "sessionId": "a2d53b48-6c1e-4f62-9b50-3bc6b59adbb4"
}
```
- `reply`: Assistant response generated via OpenAI `gpt-4o`.
- `sessionId`: The active session to reuse on subsequent calls.

### Rate Limiting
- Global limiter: 60 requests per IP per 60 seconds (configurable via `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_SECONDS` in `src/constants/index.ts`).
- Backed by Redis through `express-rate-limit` + `rate-limit-redis`; if Redis is down, the middleware fails open to avoid blocking traffic.

## Architecture & Design Decisions
- Folder structure keeps concerns separated:
  - `src/app.ts`: Express bootstrap and route wiring.
  - `src/controllers`: HTTP handling + Zod validation.
  - `src/services`: Business logic (`chatService` for session creation, OpenAI calls; `cacheService` for Redis-backed history).
  - `src/lib`: Shared clients (Prisma, OpenAI, Redis).
  - `src/middlewares`, `src/utils`, `src/types`, `src/constants`: Error handling, helpers, shared types, and configuration values.
- Security and performance middleware: Helmet for headers, `hpp` to block HTTP parameter pollution, JSON body size limits, CORS, Redis-backed rate limiting, and `compression` to gzip responses.
- Redis caches session histories with a 1-hour TTL (`SESSION_TTL_SECONDS`) to avoid repeat database reads and trim response latency; cache invalidation happens whenever a new message is written.
- Redis also backs rate limiting for consistent counters across instances.
- Conversation context is capped to the most recent 10 messages (`HISTORY_LIMIT`) before sending to OpenAI to control token usage while preserving relevance.
- JSON body size is limited (`JSON_BODY_LIMIT`) to guard against oversized payloads.
- Environment variables are validated at startup via Zod to fail fast when config is wrong.
- Redis uses `lazyConnect` to keep startup fast and tolerate temporary cache downtime.
- "Boring makes money": a small Express server, strict TypeScript, Prisma for migrations/queries, and minimal dependencies—no over-engineering.

## Testing & Checks
- Type-check and build: `npm run build`
- Lint: `npm run lint`
- Format check: `npm run format`
