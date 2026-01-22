ALTER TABLE "user_settings" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "onboarding_completed_at" timestamp;