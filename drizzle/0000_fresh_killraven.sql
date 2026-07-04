CREATE TYPE "public"."category" AS ENUM('utflykt', 'mat', 'bar', 'kultur', 'strand', 'sport', 'shopping', 'annat');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"lat" double precision,
	"lng" double precision,
	"address" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"budget_min" integer,
	"budget_max" integer,
	"duration_min" integer,
	"category" "category" DEFAULT 'annat' NOT NULL,
	"added_by" text NOT NULL,
	"photos" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_activities" (
	"day_date" date NOT NULL,
	"activity_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "day_activities_day_date_activity_id_pk" PRIMARY KEY("day_date","activity_id")
);
--> statement-breakpoint
CREATE TABLE "days" (
	"date" date PRIMARY KEY NOT NULL,
	"participants" text[] DEFAULT '{}' NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "role" NOT NULL,
	"content" text NOT NULL,
	"author" text,
	"day_date" date,
	"activity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "day_activities" ADD CONSTRAINT "day_activities_day_date_days_date_fk" FOREIGN KEY ("day_date") REFERENCES "public"."days"("date") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_activities" ADD CONSTRAINT "day_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_day_date_days_date_fk" FOREIGN KEY ("day_date") REFERENCES "public"."days"("date") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;