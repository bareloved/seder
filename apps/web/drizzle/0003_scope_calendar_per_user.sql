-- Scope calendarEventId uniqueness per user and strengthen month query indexes
DROP INDEX IF EXISTS "income_calendar_event_id_key";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c WHERE c.relname = 'income_calendar_event_user_key'
  ) THEN
    CREATE UNIQUE INDEX "income_calendar_event_user_key"
    ON "income_entries" ("user_id", "calendar_event_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c WHERE c.relname = 'income_user_date_idx'
  ) THEN
    CREATE INDEX "income_user_date_idx"
    ON "income_entries" ("user_id", "date");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c WHERE c.relname = 'user_id_idx'
  ) THEN
    CREATE INDEX "user_id_idx"
    ON "income_entries" ("user_id");
  END IF;
END $$;

