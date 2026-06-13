# AtomQuest — Video Calling Platform

A web-based video calling platform built for the Atomberg AtomQuest Hackathon.
Agents create support sessions, customers join via invite links, and both sides
participate in live audio/video calls with in-call chat and call recording.

## Features

- **Agent dashboard** — create sessions, generate invite links, view history
- **Live video calls** — WebRTC peer-to-peer via simple-peer
- **In-call chat** — real-time via Socket.IO
- **Call recording** — agents can record calls and download as `.webm`
- **Customer join flow** — public invite link, no account required
- **Admin dashboard** — view all sessions, stats, force-end active sessions

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS + shadcn/ui |
| Real-time | Socket.IO (signaling) + WebRTC via simple-peer |
| Backend | Express 5 + Socket.IO server |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Hand-rolled HMAC-SHA256 JWT (no external library) |

## Project structure

```
artifacts/atomquest/
├── src/                    React + Vite frontend
│   ├── components/         Shared UI (CallRoom, VideoTile, ChatPanel, …)
│   ├── pages/              Route pages (Login, AgentDashboard, AdminDashboard, …)
│   ├── contexts/           AuthContext
│   └── lib/                api-client, socket setup, utilities
├── server/                 Express + Socket.IO backend
│   ├── src/
│   │   ├── routes/         REST API routes (auth, sessions, admin, health)
│   │   ├── lib/            JWT, auth middleware, Socket.IO signaling, seed
│   │   └── db/             Drizzle schema + DB connection
│   ├── drizzle.config.ts
│   └── package.json
├── index.html
├── vite.config.ts          Dev server + /api proxy for standalone mode
├── .env.example
└── README.md               ← you are here
```

## Quick start (standalone)

### Prerequisites

- Node.js 20+ and pnpm (`npm i -g pnpm`)
- PostgreSQL database

### 1. Clone and install

```bash
git clone <your-repo-url>
cd atomquest   # or wherever you cloned to
```

Install frontend dependencies:
```bash
pnpm install
```

Install server dependencies:
```bash
cd server && pnpm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:
```
DATABASE_URL=postgresql://user:password@localhost:5432/atomquest
SESSION_SECRET=some-long-random-string
```

### 3. Set up the database

```bash
cd server
pnpm db:push       # create tables
cd ..
```

### 4. Run in development

Start the API server (in one terminal):
```bash
cd server
PORT=5000 pnpm dev
```

Start the frontend (in another terminal, from the `artifacts/atomquest` root):
```bash
PORT=3000 pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The Vite dev server automatically proxies `/api` requests to `localhost:5000`.

## Demo accounts

These are auto-seeded when the server starts:

| Role | Username | Password |
|---|---|---|
| Agent | `agent` | `agent123` |
| Agent | `agent2` | `agent123` |
| Admin | `admin` | `admin123` |
| Customer | (invite link only) | — |

## How to demo a live call

1. Sign in as `agent` → **New Session** → **Copy Invite**
2. Open the invite link in a different browser (or incognito tab)
3. Enter a name → **Join Call**
4. Both sides get live video/audio + chat
5. As the agent, click **Record** to record the call, then **Stop Rec** to get a download link

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret key for JWT signing |
| `PORT` | Server | Server port (default: 5000) |
| `PORT` | Client | Vite dev server port (default: 3000) |
| `SERVER_PORT` | Client | Override API proxy target port (default: 5000) |

## Architecture notes

- **JWT auth** — HMAC-SHA256, stored in `localStorage`. No external library.
- **WebRTC signaling** — SDP offer/answer + ICE candidates relayed via Socket.IO at `/api/socket.io`.
- **Customer auth** — no account required; display name stored in `localStorage` for session duration.
- **Call recording** — `MediaRecorder` on local video + `AudioContext` mix of all participants' audio. Downloads as `.webm`.
