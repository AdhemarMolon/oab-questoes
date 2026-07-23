CREATE TYPE "public"."access_grant_source" AS ENUM('FREE', 'SUBSCRIPTION', 'PURCHASE', 'GIFT', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."announcement_audience" AS ENUM('ALL', 'FREE', 'FULL_ACCESS');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('IN_PROGRESS', 'SUBMITTED', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."audit_actor_type" AS ENUM('USER', 'SYSTEM', 'WEBHOOK');--> statement-breakpoint
CREATE TYPE "public"."billing_order_kind" AS ENUM('SUBSCRIPTION', 'ONE_TIME');--> statement-breakpoint
CREATE TYPE "public"."billing_order_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."billing_subscription_status" AS ENUM('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."plan_code" AS ENUM('FREE', 'MONTHLY', 'ANNUAL', 'LIFETIME');--> statement-breakpoint
CREATE TYPE "public"."simulation_access" AS ENUM('FREE', 'FULL_ACCESS');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'ANONYMIZED');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('UNVERIFIED', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');--> statement-breakpoint
CREATE TABLE "access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan" "plan_code" NOT NULL,
	"source" "access_grant_source" NOT NULL,
	"billing_order_id" uuid,
	"billing_subscription_id" uuid,
	"granted_by_user_id" text,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" text,
	"revocation_reason" text,
	"note" text,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_grants_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "access_grants_dates_valid" CHECK ("access_grants"."ends_at" is null or "access_grants"."ends_at" > "access_grants"."starts_at"),
	CONSTRAINT "access_grants_plan_duration_valid" CHECK (("access_grants"."plan" in ('FREE', 'LIFETIME') and "access_grants"."ends_at" is null) or ("access_grants"."plan" in ('MONTHLY', 'ANNUAL') and "access_grants"."ends_at" is not null)),
	CONSTRAINT "access_grants_source_links_valid" CHECK (
        ("access_grants"."source" = 'FREE' and "access_grants"."plan" = 'FREE' and "access_grants"."billing_order_id" is null and "access_grants"."billing_subscription_id" is null and "access_grants"."granted_by_user_id" is null)
        or ("access_grants"."source" = 'SUBSCRIPTION' and "access_grants"."plan" in ('MONTHLY', 'ANNUAL') and "access_grants"."billing_subscription_id" is not null and "access_grants"."billing_order_id" is null and "access_grants"."granted_by_user_id" is null)
        or ("access_grants"."source" = 'PURCHASE' and "access_grants"."plan" = 'LIFETIME' and "access_grants"."billing_order_id" is not null and "access_grants"."billing_subscription_id" is null and "access_grants"."granted_by_user_id" is null)
        or ("access_grants"."source" in ('GIFT', 'ADMIN') and "access_grants"."plan" <> 'FREE' and "access_grants"."billing_order_id" is null and "access_grants"."billing_subscription_id" is null and "access_grants"."granted_by_user_id" is not null)
      ),
	CONSTRAINT "access_grants_revocation_valid" CHECK ("access_grants"."revoked_at" is null or ("access_grants"."revoked_by_user_id" is not null and "access_grants"."revocation_reason" is not null))
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_receipts" (
	"announcement_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed_at" timestamp with time zone,
	CONSTRAINT "announcement_receipts_announcement_id_user_id_pk" PRIMARY KEY("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(220) NOT NULL,
	"body" text NOT NULL,
	"audience" "announcement_audience" DEFAULT 'ALL' NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"dismissible" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcements_dates_valid" CHECK ("announcements"."ends_at" is null or "announcements"."ends_at" > "announcements"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_user_id" text,
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" text NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"reason" text,
	"request_id" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_user_actor_has_user" CHECK ("audit_logs"."actor_type" <> 'USER' or "audit_logs"."actor_user_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "billing_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan" "plan_code" NOT NULL,
	"kind" "billing_order_kind" NOT NULL,
	"status" "billing_order_status" DEFAULT 'PENDING' NOT NULL,
	"provider" varchar(40) DEFAULT 'abacatepay' NOT NULL,
	"external_id" text,
	"idempotency_key" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"checkout_url" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_orders_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "billing_orders_amount_positive" CHECK ("billing_orders"."amount_cents" > 0),
	CONSTRAINT "billing_orders_currency_upper" CHECK ("billing_orders"."currency" = upper("billing_orders"."currency")),
	CONSTRAINT "billing_orders_plan_kind_valid" CHECK (("billing_orders"."plan" in ('MONTHLY', 'ANNUAL') and "billing_orders"."kind" = 'SUBSCRIPTION') or ("billing_orders"."plan" = 'LIFETIME' and "billing_orders"."kind" = 'ONE_TIME'))
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan" "plan_code" NOT NULL,
	"provider" varchar(40) DEFAULT 'abacatepay' NOT NULL,
	"external_id" text,
	"status" "billing_subscription_status" DEFAULT 'PENDING' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"last_provider_event_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_subscriptions_recurring_plan" CHECK ("billing_subscriptions"."plan" in ('MONTHLY', 'ANNUAL')),
	CONSTRAINT "billing_subscriptions_period_valid" CHECK (("billing_subscriptions"."current_period_start" is null and "billing_subscriptions"."current_period_end" is null) or ("billing_subscriptions"."current_period_start" is not null and "billing_subscriptions"."current_period_end" is not null and "billing_subscriptions"."current_period_end" > "billing_subscriptions"."current_period_start"))
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition" integer NOT NULL,
	"year" integer NOT NULL,
	"phase" integer DEFAULT 1 NOT NULL,
	"title" varchar(200) NOT NULL,
	"booklet_code" varchar(40) DEFAULT 'TYPE_1' NOT NULL,
	"booklet_name" varchar(100),
	"source_url" text,
	"source_checksum" varchar(64),
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exams_edition_positive" CHECK ("exams"."edition" > 0),
	CONSTRAINT "exams_phase_positive" CHECK ("exams"."phase" > 0),
	CONSTRAINT "exams_year_valid" CHECK ("exams"."year" >= 1900)
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" text NOT NULL,
	"question_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(50) NOT NULL,
	"exam_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"statement" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_answer" varchar(1),
	"explanation" text,
	"annulled" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"verification_status" "verification_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"source" text,
	"source_url" text,
	"source_page" integer,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"deleted_at" timestamp with time zone,
	"deleted_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "questions_number_positive" CHECK ("questions"."number" > 0),
	CONSTRAINT "questions_version_positive" CHECK ("questions"."version" > 0),
	CONSTRAINT "questions_options_is_object" CHECK (jsonb_typeof("questions"."options") = 'object'),
	CONSTRAINT "questions_answer_valid" CHECK ("questions"."correct_answer" is null or "questions"."correct_answer" in ('A', 'B', 'C', 'D', 'E')),
	CONSTRAINT "questions_annulled_has_no_answer" CHECK (not "questions"."annulled" or "questions"."correct_answer" is null)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "simulation_answers" (
	"attempt_question_id" uuid PRIMARY KEY NOT NULL,
	"selected_answer" varchar(1) NOT NULL,
	"is_correct" boolean NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_answers_selected_valid" CHECK ("simulation_answers"."selected_answer" in ('A', 'B', 'C', 'D', 'E'))
);
--> statement-breakpoint
CREATE TABLE "simulation_attempt_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"correct_answer_snapshot" varchar(1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_attempt_questions_position_positive" CHECK ("simulation_attempt_questions"."position" > 0),
	CONSTRAINT "simulation_attempt_questions_answer_valid" CHECK ("simulation_attempt_questions"."correct_answer_snapshot" is null or "simulation_attempt_questions"."correct_answer_snapshot" in ('A', 'B', 'C', 'D', 'E'))
);
--> statement-breakpoint
CREATE TABLE "simulation_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"simulation_id" uuid NOT NULL,
	"status" "attempt_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"free_access_claim" boolean DEFAULT false NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_answers" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone,
	"client_request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_attempts_total_positive" CHECK ("simulation_attempts"."total_questions" > 0),
	CONSTRAINT "simulation_attempts_score_valid" CHECK ("simulation_attempts"."correct_answers" is null or ("simulation_attempts"."correct_answers" >= 0 and "simulation_attempts"."correct_answers" <= "simulation_attempts"."total_questions"))
);
--> statement-breakpoint
CREATE TABLE "simulation_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"simulation_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_questions_position_positive" CHECK ("simulation_questions"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(220) NOT NULL,
	"description" text,
	"access" "simulation_access" DEFAULT 'FULL_ACCESS' NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"duration_minutes" integer,
	"published_at" timestamp with time zone,
	"created_by_user_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "simulations_duration_positive" CHECK ("simulations"."duration_minutes" is null or "simulations"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(160) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_slug_unique" UNIQUE("slug"),
	CONSTRAINT "subjects_name_unique" UNIQUE("name"),
	CONSTRAINT "subjects_display_order_nonnegative" CHECK ("subjects"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"auth_version" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_auth_version_nonnegative" CHECK ("user"."auth_version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(40) DEFAULT 'abacatepay' NOT NULL,
	"external_event_id" text,
	"payload_hash" varchar(64) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_status" DEFAULT 'RECEIVED' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "webhook_events_attempt_nonnegative" CHECK ("webhook_events"."attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_billing_order_id_billing_orders_id_fk" FOREIGN KEY ("billing_order_id") REFERENCES "public"."billing_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_billing_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("billing_subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_granted_by_user_id_user_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_revoked_by_user_id_user_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_orders" ADD CONSTRAINT "billing_orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_deleted_by_user_id_user_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_answers" ADD CONSTRAINT "simulation_answers_attempt_question_id_simulation_attempt_questions_id_fk" FOREIGN KEY ("attempt_question_id") REFERENCES "public"."simulation_attempt_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_attempt_questions" ADD CONSTRAINT "simulation_attempt_questions_attempt_id_simulation_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."simulation_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_attempt_questions" ADD CONSTRAINT "simulation_attempt_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_attempts" ADD CONSTRAINT "simulation_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_attempts" ADD CONSTRAINT "simulation_attempts_simulation_id_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_questions" ADD CONSTRAINT "simulation_questions_simulation_id_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_questions" ADD CONSTRAINT "simulation_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_grants_subscription_unique" ON "access_grants" USING btree ("billing_subscription_id") WHERE "access_grants"."billing_subscription_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "access_grants_purchase_unique" ON "access_grants" USING btree ("billing_order_id") WHERE "access_grants"."billing_order_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "access_grants_default_active_unique" ON "access_grants" USING btree ("user_id") WHERE "access_grants"."source" = 'FREE' and "access_grants"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "access_grants_user_active_idx" ON "access_grants" USING btree ("user_id","revoked_at","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "announcement_receipts_user_idx" ON "announcement_receipts" USING btree ("user_id","seen_at");--> statement-breakpoint
CREATE INDEX "announcements_active_idx" ON "announcements" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_created_idx" ON "audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_orders_provider_external_unique" ON "billing_orders" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "billing_orders_user_created_at_idx" ON "billing_orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "billing_orders_status_created_at_idx" ON "billing_orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscriptions_provider_external_unique" ON "billing_subscriptions" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "billing_subscriptions_user_status_idx" ON "billing_subscriptions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "billing_subscriptions_status_period_end_idx" ON "billing_subscriptions" USING btree ("status","current_period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "exams_edition_phase_booklet_unique" ON "exams" USING btree ("edition","phase","booklet_code");--> statement-breakpoint
CREATE INDEX "exams_status_edition_idx" ON "exams" USING btree ("status","edition");--> statement-breakpoint
CREATE INDEX "favorites_question_idx" ON "favorites" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "favorites_user_created_idx" ON "favorites" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_exam_number_active_unique" ON "questions" USING btree ("exam_id","number") WHERE "questions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "questions_catalog_idx" ON "questions" USING btree ("status","exam_id","subject_id","number");--> statement-breakpoint
CREATE INDEX "questions_subject_status_idx" ON "questions" USING btree ("subject_id","status");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_expires_at_idx" ON "session" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "simulation_attempt_questions_position_unique" ON "simulation_attempt_questions" USING btree ("attempt_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "simulation_attempt_questions_question_unique" ON "simulation_attempt_questions" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "simulation_attempt_questions_order_idx" ON "simulation_attempt_questions" USING btree ("attempt_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "simulation_attempts_user_request_unique" ON "simulation_attempts" USING btree ("user_id","client_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "simulation_attempts_one_free_claim_per_user_unique" ON "simulation_attempts" USING btree ("user_id") WHERE "simulation_attempts"."free_access_claim" = true;--> statement-breakpoint
CREATE INDEX "simulation_attempts_user_started_idx" ON "simulation_attempts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "simulation_attempts_simulation_status_idx" ON "simulation_attempts" USING btree ("simulation_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "simulation_questions_position_unique" ON "simulation_questions" USING btree ("simulation_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "simulation_questions_question_unique" ON "simulation_questions" USING btree ("simulation_id","question_id");--> statement-breakpoint
CREATE INDEX "simulation_questions_order_idx" ON "simulation_questions" USING btree ("simulation_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "simulations_single_free_published_unique" ON "simulations" USING btree ("access") WHERE "simulations"."access" = 'FREE' and "simulations"."status" = 'PUBLISHED' and "simulations"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "simulations_catalog_idx" ON "simulations" USING btree ("status","access","published_at");--> statement-breakpoint
CREATE INDEX "subjects_active_order_idx" ON "subjects" USING btree ("is_active","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_lower_unique" ON "user" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "user_created_at_id_idx" ON "user" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "user_role_status_created_at_idx" ON "user" USING btree ("role","status","created_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_external_unique" ON "webhook_events" USING btree ("provider","external_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_payload_unique" ON "webhook_events" USING btree ("provider","payload_hash");--> statement-breakpoint
CREATE INDEX "webhook_events_status_received_at_idx" ON "webhook_events" USING btree ("status","received_at");