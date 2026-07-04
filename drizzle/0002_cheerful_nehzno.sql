CREATE TABLE "activity_status" (
	"activity_id" uuid NOT NULL,
	"person" text NOT NULL,
	"status" integer NOT NULL,
	CONSTRAINT "activity_status_activity_id_person_pk" PRIMARY KEY("activity_id","person")
);
--> statement-breakpoint
ALTER TABLE "activity_status" ADD CONSTRAINT "activity_status_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;