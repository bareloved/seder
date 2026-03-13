CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dismissed_nudges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entry_id" uuid,
	"nudge_type" varchar(30) NOT NULL,
	"period_key" varchar(20),
	"dismissed_at" timestamp DEFAULT now() NOT NULL,
	"snooze_until" timestamp,
	"last_pushed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "nudge_invoice_days" numeric(3, 0) DEFAULT '3';--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "nudge_payment_days" numeric(3, 0) DEFAULT '14';--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "nudge_push_enabled" json;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dismissed_nudges" ADD CONSTRAINT "dismissed_nudges_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dismissed_nudges" ADD CONSTRAINT "dismissed_nudges_entry_id_income_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."income_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_user_token_idx" ON "device_tokens" USING btree ("user_id","token");--> statement-breakpoint
CREATE UNIQUE INDEX "dismissed_nudges_user_entry_type_key" ON "dismissed_nudges" USING btree ("user_id","entry_id","nudge_type");--> statement-breakpoint
CREATE UNIQUE INDEX "dismissed_nudges_user_type_period_key" ON "dismissed_nudges" USING btree ("user_id","nudge_type","period_key");--> statement-breakpoint
CREATE INDEX "dismissed_nudges_user_idx" ON "dismissed_nudges" USING btree ("user_id");