CREATE INDEX "date_idx" ON "income_entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "invoice_status_idx" ON "income_entries" USING btree ("invoice_status");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "income_entries" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "client_name_idx" ON "income_entries" USING btree ("client_name");