import { desc, eq } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import { messages } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasDb()) return Response.json({ messages: [], dbMissing: true });
  const me = new URL(req.url).searchParams.get("me");
  if (!me) return Response.json({ messages: [] });
  const db = getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.owner, me))
    .orderBy(desc(messages.createdAt))
    .limit(50);
  return Response.json({ messages: rows.reverse() });
}
