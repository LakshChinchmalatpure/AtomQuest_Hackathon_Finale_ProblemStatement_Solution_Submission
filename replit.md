# AtomQuest — Video Calling Platform

A web-based video calling platform for the Atomberg "AtomQuest" hackathon. Agents create sessions, customers join via invite links, and everyone participates in live audio/video calls with in-call chat.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/atomquest run dev` — run the frontend (port from $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui components
- Real-time: Socket.IO (signaling), WebRTC via simple-peer (video/audio)
- API: Express 5 + Socket.IO server
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/atomquest/` — React + Vite frontend (all UI, WebRTC, Socket.IO client)
- `artifacts/api-server/` — Express + Socket.IO backend
- `lib/db/src/schema/` — Database schema: `users.ts`, `sessions.ts`, `chat_messages.ts`
- `lib/api-spec/openapi.yaml` — Source of truth for the API contract
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks
- `lib/api-zod/src/generated/api.schemas.ts` — Generated Zod schemas

## Architecture decisions

- **JWT auth** — Hand-rolled HMAC-SHA256 JWT using Node.js `crypto` (no jwt library dep). Tokens stored in localStorage, injected via `setAuthTokenGetter` from the API client.
- **WebRTC via simple-peer** — simple-peer wraps the RTCPeerConnection API; signaling (ICE candidates + SDP offer/answer) routes through our Socket.IO server on `/api/socket.io`.
- **Socket.IO path** — The Socket.IO server mounts at `/api/socket.io` so it goes through the shared reverse proxy on the correct path.
- **Customer auth** — Customers don't create accounts. They enter their name on the join page; their identity is stored in localStorage for the session duration.
- **Node.js polyfills** — `vite-plugin-node-polyfills` with `events`, `util`, `buffer`, `stream` and `global` polyfills is required for simple-peer and socket.io-client to work in Vite.

## Product

- **Agent dashboard** — Create sessions, generate invite links, see session history with status badges
- **Agent call room** — Full video call with remote video tile, local preview, mute/camera/chat controls, invite copy, end session
- **Customer join** — Public invite link (`/join/:token`), enter name, join call
- **Customer call room** — Same video UI, leave button only (no end session)
- **Admin dashboard** — All sessions table with stats (total, active, waiting, ended, message count), force-end active sessions

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Agent | `agent` | `agent123` |
| Agent | `agent2` | `agent123` |
| Admin | `admin` | `admin123` |
| Customer | (via invite link only) | — |

## User preferences

- All code in the `artifacts/atomquest` folder for the web frontend
- No emojis in the UI
- Dark professional theme (deep navy + cyan primary)

## Gotchas

- After changing `lib/db` schema: run `pnpm run typecheck:libs` before typechecking artifacts
- After changing `lib/db` schema: run `pnpm --filter @workspace/db run push` to apply to DB
- `vite-plugin-node-polyfills` is required for simple-peer; `global: "globalThis"` define alone is not sufficient
- The Socket.IO server lives in `artifacts/api-server/src/lib/socket.ts` and is initialized from `index.ts` (not `app.ts`) because it needs an `http.Server` instance, not an Express app
- Express 5 types `req.params` values as `string | string[]` — always use `String(req.params.foo)` when passing to drizzle `eq()`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
