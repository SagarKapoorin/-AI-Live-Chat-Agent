# Spur AI Support Chat

Mini live-chat app with an AI support agent. React + Vite frontend, Express + TypeScript backend, PostgreSQL, Redis cache, and OpenAI for replies.

## Structure
- `server/` – Backend API, persistence, caching, and LLM integration. See `server/README.md` for full setup and API docs.
- `client/` – Chat UI consuming the backend. See `client/README.md` for setup and UX notes.

## Tradeoffs / If there was more time
- Add test.
- Better UI/UX - not a designer so not good at desgin.
- Add data ingestion (order realted and company realted data) and vector search in LLM will improve LLM performace.
- Add rate limits per session/user, not just IP.
- Storing api metrics in database 
- fake LLM for offline users
- storing user feedback - can use to improve llm resposes
