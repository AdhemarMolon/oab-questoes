ALTER TABLE "simulation_attempt_questions" ADD COLUMN "skipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "simulation_attempts" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
UPDATE "simulation_attempts"
SET "expires_at" = CASE
  WHEN "simulation_attempts"."status" = 'IN_PROGRESS'
    THEN current_timestamp + make_interval(mins => "simulations"."duration_minutes")
  ELSE "simulation_attempts"."started_at" + make_interval(mins => "simulations"."duration_minutes")
END
FROM "simulations"
WHERE "simulation_attempts"."simulation_id" = "simulations"."id"
  AND "simulations"."duration_minutes" IS NOT NULL
  AND "simulation_attempts"."expires_at" IS NULL;
