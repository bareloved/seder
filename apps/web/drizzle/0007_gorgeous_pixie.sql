CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"category" varchar(20) DEFAULT 'general' NOT NULL,
	"platform" varchar(10) DEFAULT 'web' NOT NULL,
	"status" varchar(15) DEFAULT 'unread' NOT NULL,
	"admin_reply" text,
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rolling_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" varchar(500) NOT NULL,
	"client_id" uuid,
	"client_name" varchar(100) NOT NULL,
	"category_id" uuid,
	"amount_gross" numeric(12, 2) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '18' NOT NULL,
	"includes_vat" boolean DEFAULT true NOT NULL,
	"default_invoice_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"cadence" json NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"source_calendar_recurring_event_id" varchar(255),
	"source_calendar_id" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_config" (
	"key" varchar(50) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "income_entries" ADD COLUMN "rolling_job_id" uuid;--> statement-breakpoint
ALTER TABLE "income_entries" ADD COLUMN "detached_from_template" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "nudge_weekly_day" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rolling_jobs" ADD CONSTRAINT "rolling_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rolling_jobs" ADD CONSTRAINT "rolling_jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rolling_jobs" ADD CONSTRAINT "rolling_jobs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_user_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rolling_jobs_user_id_idx" ON "rolling_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rolling_jobs_user_active_idx" ON "rolling_jobs" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "rolling_jobs_user_cal_recurring_idx" ON "rolling_jobs" USING btree ("user_id","source_calendar_recurring_event_id");--> statement-breakpoint
ALTER TABLE "income_entries" ADD CONSTRAINT "income_entries_rolling_job_id_rolling_jobs_id_fk" FOREIGN KEY ("rolling_job_id") REFERENCES "public"."rolling_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "income_rolling_job_date_key" ON "income_entries" USING btree ("rolling_job_id","date") WHERE "income_entries"."rolling_job_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "nudge_invoice_days";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "nudge_payment_days";