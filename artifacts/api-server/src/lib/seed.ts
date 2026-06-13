import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const DEMO_USERS = [
  { username: "agent", password: "agent123", role: "agent", displayName: "Alex Agent" },
  { username: "agent2", password: "agent123", role: "agent", displayName: "Bob Agent" },
  { username: "customer", password: "customer123", role: "customer", displayName: "Chris Customer" },
  { username: "admin", password: "admin123", role: "admin", displayName: "Admin User" },
];

export async function seedDemoData() {
  for (const u of DEMO_USERS) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, u.username));
    if (!existing) {
      await db.insert(usersTable).values(u);
      logger.info({ username: u.username }, "Seeded demo user");
    }
  }
}
