import { Router } from "express";
import { db, sessionsTable, chatMessagesTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth-middleware";

const router = Router();

router.get("/admin/sessions", requireAuth, requireRole("admin"), async (_req, res) => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.createdAt));

  const result = await Promise.all(
    sessions.map(async (s) => {
      const [{ count: msgCount }] = await db
        .select({ count: count() })
        .from(chatMessagesTable)
        .where(eq(chatMessagesTable.sessionId, s.id));

      const durationSeconds =
        s.startedAt && s.endedAt
          ? Math.floor((s.endedAt.getTime() - s.startedAt.getTime()) / 1000)
          : s.startedAt && s.status === "active"
          ? Math.floor((Date.now() - s.startedAt.getTime()) / 1000)
          : null;

      return {
        id: s.id,
        title: s.title,
        status: s.status,
        agentId: s.agentId,
        agentName: s.agentName,
        customerName: s.customerName ?? null,
        startedAt: s.startedAt?.toISOString() ?? null,
        endedAt: s.endedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        messageCount: Number(msgCount),
        durationSeconds,
      };
    })
  );

  res.json(result);
});

router.get("/admin/stats", requireAuth, requireRole("admin"), async (_req, res) => {
  const sessions = await db.select().from(sessionsTable);
  const [{ count: totalMessages }] = await db
    .select({ count: count() })
    .from(chatMessagesTable);

  res.json({
    totalSessions: sessions.length,
    activeSessions: sessions.filter((s) => s.status === "active").length,
    endedSessions: sessions.filter((s) => s.status === "ended").length,
    waitingSessions: sessions.filter((s) => s.status === "waiting").length,
    totalMessages: Number(totalMessages),
  });
});

router.post("/admin/sessions/:sessionId/end", requireAuth, requireRole("admin"), async (req, res) => {
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
  res.json({
    id: session.id,
    title: session.title,
    status: session.status,
    agentId: session.agentId,
    agentName: session.agentName,
    customerName: session.customerName ?? null,
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
  });
});

export default router;
