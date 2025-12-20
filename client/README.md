# Spur AI Chat Frontend

React + Vite chat widget that talks to the Spur AI support backend.

## Prerequisites
- Node.js 20+
- Backend running (default `http://localhost:3000`)

## Setup
1. `cd client`
2. Create `.env`:
   ```
   VITE_SERVER_URL=http://localhost:3000
   ```
3. Install deps: `npm install`
4. Run dev server: `npm run dev`
5. Build: `npm run build`

## Features
- Scrollable history with auto-scroll to the newest message
- Enter-to-send; send button disabled while the request is in flight
- “Agent is typing” indicator while waiting for the reply
- Inline error alert plus an error bubble when the backend returns `{ error: string }`
- Persists `sessionId` in `localStorage` so history reloads on refresh

## Backend Contract
- POST `/api/chat/message` → `{ reply: string, sessionId: string }`
- GET `/api/chat/history/:sessionId` → `{ sessionId: string, history: ServerMessage[] }`
- Errors: `{ error: string }` with appropriate HTTP status (400 validation, 429 rate limit, 503 temporary failure); the UI shows the provided message directly.
