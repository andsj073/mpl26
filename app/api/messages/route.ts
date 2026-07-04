import { desc } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import { messages } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return Response.json({ messages: [], dbMissing: true });
  const db = getDb();
  const rows = await db
    .select()
    .from(messages)
    .orderBy(desc(messages.createdAt))
    .limit(50);
  return Response.json({ messages: rows.reverse() });
}
