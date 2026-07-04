ALTER TABLE "activities" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "owner" text;--> statement-breakpoint
UPDATE "messages" SET "owner" = "author" WHERE "role" = 'user';--> statement-breakpoint
UPDATE "messages" m SET "owner" = (
  SELECT m2."author" FROM "messages" m2
  WHERE m2."role" = 'user' AND m2."created_at" <= m."created_at"
  ORDER BY m2."created_at" DESC LIMIT 1
) WHERE m."role" = 'assistant';