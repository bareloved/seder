CREATE TABLE "income_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"client_name" text NOT NULL,
	"amount_gross" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '17' NOT NULL,
	"includes_vat" boolean DEFAULT true NOT NULL,
	"invoice_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"payment_status" varchar(20) DEFAULT 'unpaid' NOT NULL,
	"calendar_event_id" varchar(255),
	"notes" text,
	"category" varchar(50),
	"invoice_sent_date" date,
	"paid_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
