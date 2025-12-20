# Spur AI Chat Support Backend

Express + TypeScript API with PostgreSQL (Prisma), Redis caching, and OpenAI-powered replies.

## Prerequisites
- Node.js 20+ with npm
- PostgreSQL 14+ reachable via `DATABASE_URL`
- Redis 6+ reachable via `REDIS_URL`
- OpenAI API key

## Quick Start
1. `cd server`
2. Copy env: `cp .env.example .env`, then set `OPENAI_API_KEY`, `DATABASE_URL`, `REDIS_URL` (optional `PORT`)
3. Install deps: `npm install`
4. Apply schema: `npm run prisma:migrate` (runs migrations and generates Prisma client)
5. Run: `npm run build && npm start` (or `npm run dev` for a quick build+run)
6. Health: `GET http://localhost:${PORT || 3000}/health`
7. API base: `http://localhost:${PORT || 3000}/api`

## Environment Variables
| Name | Required | Description | Default |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string | — |
| `REDIS_URL` | Yes | Redis connection string | — |
| `OPENAI_API_KEY` | Yes | OpenAI key for chat completions | — |
| `PORT` | No | Express port | `3000` |

## Data Model (Prisma)
- `Session`: `id (uuid)`, `createdAt`, `updatedAt`
- `Message`: `id (uuid)`, `sessionId`, `role` (`USER` | `ASSISTANT`), `content`, `createdAt`
- Index on `(sessionId, createdAt)` for chronological reads.

## API
### POST `/api/chat/message`
Send a chat message to the AI. If no `sessionId` is provided, a new session is created.
```json
{ "message": "Where is my order?", "sessionId": "uuid-optional" }
```
Response:
```json
{ "reply": "Your order is on the way.", "sessionId": "uuid" }
```

### GET `/api/chat/history/:sessionId`
Fetch previous messages for a session:
```json
{ "sessionId": "uuid", "history": [ { "id": "...", "role": "USER", "content": "...", "createdAt": "..." } ] }
```

### Health
`GET /health` → `{ "status": "ok" }`

## Validation, Limits, and Errors
- Requests trimmed and capped at 10MB (`JSON_BODY_LIMIT`).
- Message text is required, trimmed, and capped at 2000 chars. Invalid input returns `400` with a clear error string.
- LLM failures return friendly messages: `429` when rate limited; `503` when the assistant is unavailable. Generic errors fall back to a simple 500 payload.
- Error responses are shaped as `{ "error": "message" }` for the frontend to display directly.

## Rate Limiting & Caching
- Global rate limit: 60 req/IP per 60s (`RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS`) via Redis store.
- Session histories cached in Redis for 1 hour (`SESSION_TTL_SECONDS`); cache cleared whenever a new message is written.

## Architecture Overview
- `src/app.ts` – Express bootstrap, middleware, routes, health check.
- `src/controllers` – Request validation and response shaping.
- `src/services` – Business logic (`chatService`, `cacheService`), Prisma + OpenAI calls.
- `src/lib` – Shared clients (Prisma, Redis, OpenAI).
- `src/middlewares` – Error handling, rate limiting.
- `src/constants` – Config knobs for limits, prompts, and models.

## LLM Notes
- Provider/model: OpenAI `gpt-4o`
- Prompt: Helpful ecommerce support agent with shipping/returns context; concise answers; asks clarifying questions.
- History capped to 10 most recent messages before sending to the model to control token use.

## Scripts
- Type-check/build: `npm run build`
- Lint: `npm run lint`
- Format check: `npm run format`
- Prisma migrate: `npm run prisma:migrate`
