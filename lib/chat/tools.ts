import type Anthropic from "@anthropic-ai/sdk";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { activities, activityStatus, dayActivities, days } from "@/lib/db/schema";
import { FAMILY_NAMES } from "@/lib/family";

const CATEGORY_VALUES = [
  "utflykt",
  "mat",
  "bar",
  "kultur",
  "strand",
  "sport",
  "shopping",
  "annat",
] as const;

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "add_activity",
    description:
      "Lägg till en ny aktivitet i familjens idébank. Returnerar aktivitetens id.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        category: { type: "string", enum: [...CATEGORY_VALUES] },
        tags: { type: "array", items: { type: "string" } },
        budget_min: { type: "number", description: "EUR per person" },
        budget_max: { type: "number", description: "EUR per person" },
        duration_min: { type: "number", description: "minuter" },
        address: { type: "string" },
        lat: { type: "number" },
        lng: { type: "number" },
        website_url: { type: "string" },
        tripadvisor_url: { type: "string" },
      },
      required: ["title", "category"],
    },
  },
  {
    name: "update_activity",
    description:
      "Uppdatera fält på en befintlig aktivitet. Ange bara de fält som ska ändras.",
    input_schema: {
      type: "object",
      properties: {
        activity_id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        category: { type: "string", enum: [...CATEGORY_VALUES] },
        tags: { type: "array", items: { type: "string" } },
        budget_min: { type: "number" },
        budget_max: { type: "number" },
        duration_min: { type: "number" },
        address: { type: "string" },
        lat: { type: "number" },
        lng: { type: "number" },
        website_url: { type: "string" },
        tripadvisor_url: { type: "string" },
        image_url: { type: "string" },
        featured: { type: "boolean", description: "Markera som pärla" },
      },
      required: ["activity_id"],
    },
  },
  {
    name: "plan_activity",
    description:
      "Planera in en befintlig aktivitet på en dag (2026-07-10 till 2026-07-24).",
    input_schema: {
      type: "object",
      properties: {
        day_date: { type: "string", description: "YYYY-MM-DD" },
        activity_id: { type: "string" },
      },
      required: ["day_date", "activity_id"],
    },
  },
  {
    name: "unplan_activity",
    description: "Ta bort en planerad aktivitet från en dag.",
    input_schema: {
      type: "object",
      properties: {
        day_date: { type: "string" },
        activity_id: { type: "string" },
      },
      required: ["day_date", "activity_id"],
    },
  },
  {
    name: "set_activity_status",
    description:
      "Sätt en persons status på en aktivitet: 0 = planerar inte, 1 = planerar att göra, 2 = har gjort. Status 1/2 kräver day_date — vilken dag personen planerar/gjorde den. Utelämnas person gäller det den som skriver. Aktiviteten läggs automatiskt på dagen.",
    input_schema: {
      type: "object",
      properties: {
        activity_id: { type: "string" },
        person: { type: "string", description: "Namn ur familjen" },
        status: { type: "number", enum: [0, 1, 2] },
        day_date: { type: "string", description: "YYYY-MM-DD, krävs för status 1/2" },
      },
      required: ["activity_id", "status"],
    },
  },
  {
    name: "update_day",
    description:
      "Uppdatera en dags fria anteckning. Vilka som deltar styrs inte här — det följer av personers status på dagens aktiviteter (set_activity_status).",
    input_schema: {
      type: "object",
      properties: {
        day_date: { type: "string" },
        notes: { type: "string", description: "Ersätter dagens anteckning" },
      },
      required: ["day_date"],
    },
  },
];

/** Kör ett verktygsanrop. Returnerar {result, label} där label visas i UI:t. */
export async function runTool(
  name: string,
  input: Record<string, unknown>
): Promise<{ result: string; label: string }> {
  const db = getDb();

  switch (name) {
    case "add_activity": {
      const [row] = await db
        .insert(activities)
        .values({
          title: String(input.title),
          description: (input.description as string) ?? null,
          category: input.category as (typeof CATEGORY_VALUES)[number],
          tags: (input.tags as string[]) ?? [],
          budgetMin: (input.budget_min as number) ?? null,
          budgetMax: (input.budget_max as number) ?? null,
          durationMin: (input.duration_min as number) ?? null,
          address: (input.address as string) ?? null,
          lat: (input.lat as number) ?? null,
          lng: (input.lng as number) ?? null,
          websiteUrl: (input.website_url as string) ?? null,
          tripadvisorUrl: (input.tripadvisor_url as string) ?? null,
          addedBy: String(input._author ?? "Chatten"),
        })
        .returning({ id: activities.id, title: activities.title });
      return {
        result: `Skapad med id ${row.id}`,
        label: `La till aktivitet: ${row.title}`,
      };
    }
    case "update_activity": {
      const id = String(input.activity_id);
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.title !== undefined) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description;
      if (input.category !== undefined) patch.category = input.category;
      if (input.tags !== undefined) patch.tags = input.tags;
      if (input.budget_min !== undefined) patch.budgetMin = input.budget_min;
      if (input.budget_max !== undefined) patch.budgetMax = input.budget_max;
      if (input.duration_min !== undefined) patch.durationMin = input.duration_min;
      if (input.address !== undefined) patch.address = input.address;
      if (input.lat !== undefined) patch.lat = input.lat;
      if (input.lng !== undefined) patch.lng = input.lng;
      if (input.website_url !== undefined) patch.websiteUrl = input.website_url;
      if (input.tripadvisor_url !== undefined) patch.tripadvisorUrl = input.tripadvisor_url;
      if (input.image_url !== undefined) patch.imageUrl = input.image_url;
      if (input.featured !== undefined) patch.featured = input.featured;
      const [row] = await db
        .update(activities)
        .set(patch)
        .where(eq(activities.id, id))
        .returning({ title: activities.title });
      if (!row) return { result: "Ingen aktivitet med det id:t", label: "Uppdatering misslyckades" };
      return { result: "Uppdaterad", label: `Uppdaterade: ${row.title}` };
    }
    case "plan_activity": {
      const dayDate = String(input.day_date);
      const activityId = String(input.activity_id);
      await db.insert(days).values({ date: dayDate }).onConflictDoNothing();
      await db
        .insert(dayActivities)
        .values({ dayDate, activityId })
        .onConflictDoNothing();
      const [a] = await db
        .select({ title: activities.title })
        .from(activities)
        .where(eq(activities.id, activityId));
      return {
        result: "Inplanerad",
        label: `Planerade in ${a?.title ?? "aktivitet"} den ${dayDate}`,
      };
    }
    case "unplan_activity": {
      const dayDate = String(input.day_date);
      const activityId = String(input.activity_id);
      await db
        .delete(dayActivities)
        .where(
          and(
            eq(dayActivities.dayDate, dayDate),
            eq(dayActivities.activityId, activityId)
          )
        );
      return { result: "Borttagen från dagen", label: `Tog bort planering ${dayDate}` };
    }
    case "set_activity_status": {
      const activityId = String(input.activity_id);
      const person = String(input.person ?? input._author);
      const status = Number(input.status);
      const dayDate = input.day_date ? String(input.day_date) : null;
      if (!FAMILY_NAMES.includes(person))
        return { result: `Okänd person: ${person}`, label: "Statusändring misslyckades" };
      if (status > 0 && !dayDate)
        return {
          result: "day_date krävs för status 1/2 — fråga vilken dag det gäller.",
          label: "Statusändring behöver en dag",
        };
      if (status === 0) {
        await db
          .delete(activityStatus)
          .where(
            and(
              eq(activityStatus.activityId, activityId),
              eq(activityStatus.person, person)
            )
          );
      } else {
        await db.insert(days).values({ date: dayDate! }).onConflictDoNothing();
        await db
          .insert(dayActivities)
          .values({ dayDate: dayDate!, activityId })
          .onConflictDoNothing();
        await db
          .insert(activityStatus)
          .values({ activityId, person, status, dayDate })
          .onConflictDoUpdate({
            target: [activityStatus.activityId, activityStatus.person],
            set: { status, dayDate },
          });
      }
      const [act] = await db
        .select({ title: activities.title })
        .from(activities)
        .where(eq(activities.id, activityId));
      const verb = status === 0 ? "planerar inte längre" : status === 1 ? "planerar" : "har gjort";
      return {
        result: "Status satt",
        label: `${person} ${verb}: ${act?.title ?? "aktivitet"}`,
      };
    }
    case "update_day": {
      const dayDate = String(input.day_date);
      await db.insert(days).values({ date: dayDate }).onConflictDoNothing();
      const patch: Record<string, unknown> = {};
      if (input.notes !== undefined) patch.notes = input.notes;
      if (Object.keys(patch).length)
        await db.update(days).set(patch).where(eq(days.date, dayDate));
      return { result: "Dagen uppdaterad", label: `Uppdaterade ${dayDate}` };
    }
    default:
      return { result: `Okänt verktyg: ${name}`, label: `Okänt verktyg` };
  }
}
