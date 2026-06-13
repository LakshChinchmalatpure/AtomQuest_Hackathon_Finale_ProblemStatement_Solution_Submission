---
name: AtomQuest auth architecture
description: How JWT auth and Socket.IO are wired up in AtomQuest
---

**JWT:** Hand-rolled HMAC-SHA256 tokens in `artifacts/api-server/src/lib/jwt.ts`. No external jwt library. Uses `SESSION_SECRET` env var with fallback. Token format: base64url(header).base64url(payload).base64url(sig).

**Frontend auth:** `lib/api-client-react` exposes `setAuthTokenGetter(getter)`. Call it once at app init (in main.tsx via `setupApi()`) with a getter that reads `localStorage.getItem("atomquest_token")`. This automatically injects `Authorization: Bearer <token>` on every API call.

**Socket.IO path:** Server mounts at `/api/socket.io` (matches the shared proxy path prefix). Client connects with `io({ path: "/api/socket.io" })`.

**Customer auth:** Customers don't have accounts. They enter a display name on the join page, stored in `localStorage.atomquest_customer_name`. A numeric ID is derived from name characters for socket room purposes.

**Why:** Keeping it simple for a hackathon demo. The hand-rolled JWT avoids adding a jsonwebtoken dep to the server bundle.

**How to apply:** If adding features that need auth, use `requireAuth` middleware from `artifacts/api-server/src/lib/auth-middleware.ts`. For role checks, use `requireRole("admin")` after `requireAuth`.
