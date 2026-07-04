import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import { days, photos } from "@/lib/db/schema";
import { FAMILY_NAMES } from "@/lib/family";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!hasDb()) {
    return Response.json({ error: "Databas saknas." }, { status: 503 });
  }
  const form = await req.formData();
  const file = form.get("file");
  const dayDate = String(form.get("dayDate") ?? "");
  const uploadedBy = String(form.get("uploadedBy") ?? "");
  const activityId = form.get("activityId")
    ? String(form.get("activityId"))
    : null;

  if (!(file instanceof File) || !file.size) {
    return Response.json({ error: "Ingen fil." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) {
    return Response.json({ error: "Ogiltigt datum." }, { status: 400 });
  }
  if (!FAMILY_NAMES.includes(uploadedBy)) {
    return Response.json({ error: "Okänd person." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json(
      { error: "Bilden är för stor — nedskalningen verkar ha misslyckats." },
      { status: 413 }
    );
  }

  const blob = await put(`dagar/${dayDate}/${randomUUID()}.jpg`, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
  });

  const db = getDb();
  await db.insert(days).values({ date: dayDate }).onConflictDoNothing();
  const [row] = await db
    .insert(photos)
    .values({ dayDate, activityId, url: blob.url, uploadedBy })
    .returning();
  return Response.json({ photo: row });
}

export async function DELETE(req: Request) {
  if (!hasDb()) {
    return Response.json({ error: "Databas saknas." }, { status: 503 });
  }
  const { id, person } = await req.json();
  const db = getDb();
  const [row] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, String(id)), eq(photos.uploadedBy, String(person))));
  if (!row) {
    return Response.json(
      { error: "Hittar inte bilden, eller så är den inte din." },
      { status: 404 }
    );
  }
  await del(row.url);
  await db.delete(photos).where(eq(photos.id, row.id));
  return Response.json({ ok: true });
}
