CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audiences" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  CONSTRAINT "audiences_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "funnel_phases" (
  "id" text PRIMARY KEY NOT NULL,
  "audience_id" text NOT NULL,
  "sort_order" integer NOT NULL,
  "name" text NOT NULL,
  "goal" text DEFAULT '' NOT NULL,
  "channels" text DEFAULT '' NOT NULL,
  "message" text DEFAULT '' NOT NULL,
  CONSTRAINT "funnel_phases_audience_order" UNIQUE("audience_id", "sort_order")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "notes" text DEFAULT '' NOT NULL,
  "kind" text NOT NULL,
  "owner_id" text NOT NULL,
  "audience_id" text,
  "phase_id" text,
  "week_start" text,
  "status" text DEFAULT 'todo' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tasks_kind_check" CHECK ("kind" in ('marketing', 'personal')),
  CONSTRAINT "tasks_status_check" CHECK ("status" in ('todo', 'doing', 'review', 'done')),
  CONSTRAINT "tasks_shape_check" CHECK (
    (
      "kind" = 'marketing'
      AND "audience_id" IS NOT NULL
      AND "phase_id" IS NOT NULL
      AND "week_start" IS NOT NULL
    )
    OR (
      "kind" = 'personal'
      AND "audience_id" IS NULL
      AND "phase_id" IS NULL
    )
  )
);
--> statement-breakpoint
ALTER TABLE "funnel_phases" ADD CONSTRAINT "funnel_phases_audience_id_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_audience_id_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_phase_id_funnel_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."funnel_phases"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tasks_week_idx" ON "tasks" USING btree ("week_start");
--> statement-breakpoint
CREATE INDEX "tasks_owner_idx" ON "tasks" USING btree ("owner_id");
