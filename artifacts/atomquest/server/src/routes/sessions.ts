import { Router } from "express";
import { db, sessionsTable, chatMessagesTable, usersTable } from "../db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth-middleware";
import { generateToken } from "../lib/jwt";
import { randomUUID } from "crypto";

const router = Router();

router.get("/sessions", requireAuth, async (req, res) => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.createdAt));
  res.json(sessions.map(toSessionDto));
});

router.post("/sessions", requireAuth, async (req, res) => {
  const schema = z.object({ title: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const user = req.user!;
  const [agentUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
  const id = randomUUID();
  const [session] = await db
    .insert(sessionsTable)
    .values({
      id,
      title: parsed.data.title,
      status: "waiting",
      agentId: user.userId,
      agentName: agentUser?.displayName ?? `Agent ${user.userId}`,
      inviteToken: generateToken(),
    })
    .returning();
  res.status(201).json(toSessionDto(session));
});

router.get("/sessions/join/:token", async (req, res) => {
  const token = String(req.params.token);
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.inviteToken, token));
  if (!session) {
    res.status(404).json({ error: "Invalid invite token" });
    return;
  }
  res.json(toSessionDto(session));
});

router.get("/sessions/:sessionId", requireAuth, async (req, res) => {
  const sessionId = String(req.params.sessionId);
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(toSessionDto(session));
});

router.delete("/sessions/:sessionId", requireAuth, async (req, res) => {
  const sessionId = String(req.params.sessionId);
  const [session] = await db
    .update(sessionsTable)
    .set({ status: "ended", endedAt: new Date() })
    .where(eq(sessionsTable.id, sessionId))
    .returning();
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(toSessionDto(session));
});

router.post("/sessions/:sessionId/invite", requireAuth, async (req, res) => {
  const sessionId = String(req.params.sessionId);
  const token = generateToken();
  const [session] = await db
    .update(sessionsTable)
    .set({ inviteToken: token })
    .where(eq(sessionsTable.id, sessionId))
    .returning();
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const host = req.headers.origin ?? `https://${req.headers.host}`;
  res.json({
    token,
    inviteUrl: `${host}/join/${token}`,
  });
});

router.get("/sessions/:sessionId/chat", requireAuth, async (req, res) => {
  const sessionId = String(req.params.sessionId);
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, sessionId))
    .orderBy(chatMessagesTable.createdAt);
  res.json(messages.map(m => ({
    id: m.id,
    sessionId: m.sessionId,
    senderId: m.senderId,
    senderName: m.senderName,
    senderRole: m.senderRole,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  })));
});

function toSessionDto(s: typeof sessionsTable.$inferSelect) {
  return {
    id: s.id,
    title: s.title,
    status: s.status,
    agentId: s.agentId,
    agentName: s.agentName,
    customerName: s.customerName ?? null,
    inviteToken: s.inviteToken ?? null,
    startedAt: s.startedAt?.toISOString() ?? null,
    endedAt: s.endedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export default router;
