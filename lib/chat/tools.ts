import type Anthropic from "@anthropic-ai/sdk";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { activities, dayActivities, days } from "@/lib/db/schema";

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
    name: "update_day",
    description:
      "Uppdatera en dags deltagare (vilka i familjen som är med) och/eller anteckningar.",
    input_schema: {
      type: "object",
      properties: {
        day_date: { type: "string" },
        participants: {
          type: "array",
          items: { type: "string" },
          description: "Namn ur familjen; ersätter hela listan",
        },
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
    case "update_day": {
      const dayDate = String(input.day_date);
      await db.insert(days).values({ date: dayDate }).onConflictDoNothing();
      const patch: Record<string, unknown> = {};
      if (input.participants !== undefined) patch.participants = input.participants;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (Object.keys(patch).length)
        await db.update(days).set(patch).where(eq(days.date, dayDate));
      return { result: "Dagen uppdaterad", label: `Uppdaterade ${dayDate}` };
    }
    default:
      return { result: `Okänt verktyg: ${name}`, label: `Okänt verktyg` };
  }
}
