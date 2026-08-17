CREATE TYPE "public"."study_activity_type" AS ENUM('QUESTIONS', 'THEORY', 'REVIEW', 'SIMULATION', 'TIME', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."study_goal_metric" AS ENUM('QUESTIONS', 'STUDY_MINUTES', 'SIMULATIONS', 'ACCURACY', 'SIMULATION_SCORE');--> statement-breakpoint
CREATE TYPE "public"."study_goal_period" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'UNTIL_DATE');--> statement-breakpoint
CREATE TABLE "daily_study_completions" (
	"user_id" text NOT NULL,
	"date_key" date NOT NULL,
	"item_key" varchar(120) NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_study_completions_user_id_date_key_item_key_pk" PRIMARY KEY("user_id","date_key","item_key")
);
--> statement-breakpoint
CREATE TABLE "question_study_states" (
	"user_id" text NOT NULL,
	"question_id" uuid NOT NULL,
	"error_note" text,
	"reviewed_at" timestamp with time zone,
	"next_review_at" timestamp with time zone,
	"review_cycle_days" integer DEFAULT 1 NOT NULL,
	"removed_from_errors_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_study_states_user_id_question_id_pk" PRIMARY KEY("user_id","question_id"),
	CONSTRAINT "question_study_states_cycle_valid" CHECK ("question_study_states"."review_cycle_days" in (1, 7, 15, 30))
);
--> statement-breakpoint
CREATE TABLE "study_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subject_id" uuid,
	"title" varchar(180) NOT NULL,
	"description" text,
	"type" "study_activity_type" DEFAULT 'CUSTOM' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"estimated_minutes" integer,
	"target_questions" integer,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_activities_minutes_positive" CHECK ("study_activities"."estimated_minutes" is null or "study_activities"."estimated_minutes" > 0),
	CONSTRAINT "study_activities_questions_positive" CHECK ("study_activities"."target_questions" is null or "study_activities"."target_questions" > 0)
);
--> statement-breakpoint
CREATE TABLE "study_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(180) NOT NULL,
	"metric" "study_goal_metric" NOT NULL,
	"period" "study_goal_period" NOT NULL,
	"target_value" integer NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_goals_target_positive" CHECK ("study_goals"."target_value" > 0),
	CONSTRAINT "study_goals_dates_valid" CHECK ("study_goals"."ends_at" is null or "study_goals"."ends_at" > "study_goals"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "study_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subject_id" uuid,
	"question_id" uuid,
	"title" varchar(180) NOT NULL,
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"exam_date" date NOT NULL,
	"days_per_week" integer NOT NULL,
	"minutes_per_day" integer NOT NULL,
	"current_level" varchar(30) NOT NULL,
	"difficult_subject_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"schedule" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_plans_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "study_plans_days_valid" CHECK ("study_plans"."days_per_week" between 1 and 7),
	CONSTRAINT "study_plans_minutes_valid" CHECK ("study_plans"."minutes_per_day" between 15 and 720)
);
--> statement-breakpoint
ALTER TABLE "daily_study_completions" ADD CONSTRAINT "daily_study_completions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_study_states" ADD CONSTRAINT "question_study_states_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_study_states" ADD CONSTRAINT "question_study_states_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_activities" ADD CONSTRAINT "study_activities_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_activities" ADD CONSTRAINT "study_activities_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_goals" ADD CONSTRAINT "study_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_notes" ADD CONSTRAINT "study_notes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_notes" ADD CONSTRAINT "study_notes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_notes" ADD CONSTRAINT "study_notes_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_study_completions_user_date_idx" ON "daily_study_completions" USING btree ("user_id","date_key");--> statement-breakpoint
CREATE INDEX "question_study_states_review_idx" ON "question_study_states" USING btree ("user_id","next_review_at");--> statement-breakpoint
CREATE INDEX "study_activities_user_schedule_idx" ON "study_activities" USING btree ("user_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "study_goals_user_active_idx" ON "study_goals" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "study_notes_user_updated_idx" ON "study_notes" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "study_notes_user_subject_idx" ON "study_notes" USING btree ("user_id","subject_id");