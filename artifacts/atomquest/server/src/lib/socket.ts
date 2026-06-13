import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { db, sessionsTable, chatMessagesTable } from "../db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

interface RoomParticipant {
  socketId: string;
  userId: number;
  userName: string;
  role: string;
}

const rooms = new Map<string, RoomParticipant[]>();

export function initSocketIO(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on("join-room", async (data: { sessionId: string; userId: number; userName: string; role: string }) => {
      const { sessionId, userId, userName, role } = data;
      socket.join(sessionId);

      if (!rooms.has(sessionId)) rooms.set(sessionId, []);
      const room = rooms.get(sessionId)!;

      const existing = room.find((p) => p.socketId === socket.id);
      if (!existing) {
        room.push({ socketId: socket.id, userId, userName, role });
      }

      socket.to(sessionId).emit("user-joined", {
        userId,
        userName,
        role,
        socketId: socket.id,
      });

      if (role === "customer") {
        try {
          await db
            .update(sessionsTable)
            .set({ status: "active", startedAt: new Date(), customerName: userName })
            .where(eq(sessionsTable.id, sessionId));
        } catch (e) {
          logger.error({ e }, "Failed to update session on customer join");
        }
      }

      logger.info({ sessionId, userId, userName, role }, "User joined room");
    });

    socket.on("signal", (data: { to: string; signal: unknown }) => {
      io.to(data.to).emit("signal", { from: socket.id, signal: data.signal });
    });

    socket.on("send-message", async (data: { sessionId: string; senderId: number; senderName: string; senderRole: string; content: string }) => {
      try {
        const [msg] = await db
          .insert(chatMessagesTable)
          .values({
            sessionId: data.sessionId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderRole: data.senderRole,
            content: data.content,
          })
          .returning();
        io.to(data.sessionId).emit("new-message", {
          id: msg.id,
          sessionId: msg.sessionId,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderRole: msg.senderRole,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
        });
      } catch (e) {
        logger.error({ e }, "Failed to save message");
      }
    });

    socket.on("end-session", async (data: { sessionId: string }) => {
      try {
        await db
          .update(sessionsTable)
          .set({ status: "ended", endedAt: new Date() })
          .where(eq(sessionsTable.id, data.sessionId));
        io.to(data.sessionId).emit("session-ended");
        rooms.delete(data.sessionId);
      } catch (e) {
        logger.error({ e }, "Failed to end session");
      }
    });

    socket.on("leave-room", (data: { sessionId: string }) => {
      const room = rooms.get(data.sessionId);
      if (room) {
        const idx = room.findIndex((p) => p.socketId === socket.id);
        const [removed] = idx >= 0 ? room.splice(idx, 1) : [];
        if (removed) {
          socket.to(data.sessionId).emit("user-left", { userId: removed.userId, socketId: socket.id });
        }
      }
      socket.leave(data.sessionId);
    });

    socket.on("disconnect", () => {
      rooms.forEach((participants, sessionId) => {
        const idx = participants.findIndex((p) => p.socketId === socket.id);
        if (idx >= 0) {
          const [removed] = participants.splice(idx, 1);
          if (removed) {
            socket.to(sessionId).emit("user-left", { userId: removed.userId, socketId: socket.id });
          }
        }
      });
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}
