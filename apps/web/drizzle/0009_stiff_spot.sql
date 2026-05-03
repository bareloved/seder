CREATE TABLE "user_consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"consent_type" varchar(30) NOT NULL,
	"terms_version" text,
	"ip_address" text,
	"user_agent" text,
	"source" varchar(30) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "income_rolling_job_date_key";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "terms_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "marketing_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "marketing_opt_in_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_consent" ADD CONSTRAINT "user_consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_consent_user_idx" ON "user_consent" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_consent_user_type_idx" ON "user_consent" USING btree ("user_id","consent_type");--> statement-breakpoint
CREATE UNIQUE INDEX "income_rolling_job_date_key" ON "income_entries" USING btree ("rolling_job_id","date");--> statement-breakpoint

-- RLS for user_consent (matches the policy pattern from 0008_enable_rls.sql).
-- Consent rows are user-scoped audit data — only the user (or admin/cron via
-- bypass) may read or insert their own rows. Per-tenant isolation guaranteed
-- at the DB layer, not just the app layer.
ALTER TABLE "user_consent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_consent" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "user_consent_tenant_isolation" ON "user_consent"
  USING (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );