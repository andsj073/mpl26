import {
  date,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const categoryEnum = pgEnum("category", [
  "utflykt",
  "mat",
  "bar",
  "kultur",
  "strand",
  "sport",
  "shopping",
  "annat",
]);

export const roleEnum = pgEnum("role", ["user", "assistant"]);

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  address: text("address"),
  tags: text("tags").array().notNull().default([]),
  budgetMin: integer("budget_min"),
  budgetMax: integer("budget_max"),
  durationMin: integer("duration_min"),
  category: categoryEnum("category").notNull().default("annat"),
  addedBy: text("added_by").notNull(),
  photos: text("photos").array().notNull().default([]),
  websiteUrl: text("website_url"),
  tripadvisorUrl: text("tripadvisor_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const days = pgTable("days", {
  date: date("date").primaryKey(), // 2026-07-10 … 2026-07-24
  participants: text("participants").array().notNull().default([]),
  notes: text("notes").notNull().default(""),
});

export const dayActivities = pgTable(
  "day_activities",
  {
    dayDate: date("day_date")
      .notNull()
      .references(() => days.date, { onDelete: "cascade" }),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.dayDate, t.activityId] })]
);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: roleEnum("role").notNull(),
  content: text("content").notNull(),
  author: text("author"), // familjemedlem för user, null för assistant
  dayDate: date("day_date").references(() => days.date, {
    onDelete: "set null",
  }),
  activityId: uuid("activity_id").references(() => activities.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Day = typeof days.$inferSelect;
export type Message = typeof messages.$inferSelect;
