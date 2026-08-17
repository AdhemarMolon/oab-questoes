import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const USER_ROLES = ["user", "admin"] as const;
export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "ANONYMIZED"] as const;
export const PLAN_CODES = ["FREE", "MONTHLY", "ANNUAL", "LIFETIME"] as const;
export const ACCESS_GRANT_SOURCES = [
  "FREE",
  "SUBSCRIPTION",
  "PURCHASE",
  "GIFT",
  "ADMIN",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type PlanCode = (typeof PLAN_CODES)[number];
export type AccessGrantSource = (typeof ACCESS_GRANT_SOURCES)[number];

export type QuestionOptions = Record<string, string>;

export type AttemptQuestionSnapshot = {
  externalId: string;
  examId: string;
  subjectId: string;
  number: number;
  statement: string;
  options: QuestionOptions;
  annulled: boolean;
  version: number;
};

export type JsonObject = Record<string, unknown>;

export const userRoleEnum = pgEnum("user_role", USER_ROLES);
export const userStatusEnum = pgEnum("user_status", USER_STATUSES);
export const planCodeEnum = pgEnum("plan_code", PLAN_CODES);
export const accessGrantSourceEnum = pgEnum(
  "access_grant_source",
  ACCESS_GRANT_SOURCES,
);
export const contentStatusEnum = pgEnum("content_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "UNVERIFIED",
  "VERIFIED",
  "REJECTED",
]);
export const billingOrderKindEnum = pgEnum("billing_order_kind", [
  "SUBSCRIPTION",
  "ONE_TIME",
]);
export const billingOrderStatusEnum = pgEnum("billing_order_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
]);
export const billingSubscriptionStatusEnum = pgEnum(
  "billing_subscription_status",
  ["PENDING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"],
);
export const webhookStatusEnum = pgEnum("webhook_status", [
  "RECEIVED",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
  "IGNORED",
]);
export const simulationAccessEnum = pgEnum("simulation_access", [
  "FREE",
  "FULL_ACCESS",
]);
export const attemptStatusEnum = pgEnum("attempt_status", [
  "IN_PROGRESS",
  "SUBMITTED",
  "ABANDONED",
]);
export const announcementAudienceEnum = pgEnum("announcement_audience", [
  "ALL",
  "FREE",
  "FULL_ACCESS",
]);
export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "USER",
  "SYSTEM",
  "WEBHOOK",
]);
export const studyActivityTypeEnum = pgEnum("study_activity_type", [
  "QUESTIONS",
  "THEORY",
  "REVIEW",
  "SIMULATION",
  "TIME",
  "CUSTOM",
]);
export const studyGoalMetricEnum = pgEnum("study_goal_metric", [
  "QUESTIONS",
  "STUDY_MINUTES",
  "SIMULATIONS",
  "ACCURACY",
  "SIMULATION_SCORE",
]);
export const studyGoalPeriodEnum = pgEnum("study_goal_period", [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "UNTIL_DATE",
]);

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Better Auth core tables. Property names intentionally match Better Auth's
// model fields while PostgreSQL uses snake_case column names.
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    role: userRoleEnum("role").default("user").notNull(),
    status: userStatusEnum("status").default("ACTIVE").notNull(),
    banned: boolean("banned").default(false).notNull(),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    authVersion: integer("auth_version").default(0).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("user_email_lower_unique").on(sql`lower(${table.email})`),
    index("user_created_at_id_idx").on(table.createdAt, table.id),
    index("user_role_status_created_at_idx").on(
      table.role,
      table.status,
      table.createdAt,
    ),
    check("user_auth_version_nonnegative", sql`${table.authVersion} >= 0`),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_user_expires_at_idx").on(table.userId, table.expiresAt),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("account_user_id_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull().unique(),
    displayOrder: integer("display_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("subjects_active_order_idx").on(table.isActive, table.displayOrder),
    check("subjects_display_order_nonnegative", sql`${table.displayOrder} >= 0`),
  ],
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    edition: integer("edition").notNull(),
    year: integer("year").notNull(),
    phase: integer("phase").default(1).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    bookletCode: varchar("booklet_code", { length: 40 }).default("TYPE_1").notNull(),
    bookletName: varchar("booklet_name", { length: 100 }),
    sourceUrl: text("source_url"),
    sourceChecksum: varchar("source_checksum", { length: 64 }),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("exams_edition_phase_booklet_unique").on(
      table.edition,
      table.phase,
      table.bookletCode,
    ),
    index("exams_status_edition_idx").on(table.status, table.edition),
    check("exams_edition_positive", sql`${table.edition} > 0`),
    check("exams_phase_positive", sql`${table.phase} > 0`),
    check("exams_year_valid", sql`${table.year} >= 1900`),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalId: varchar("external_id", { length: 50 }).notNull().unique(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    number: integer("number").notNull(),
    statement: text("statement").notNull(),
    options: jsonb("options").$type<QuestionOptions>().notNull(),
    correctAnswer: varchar("correct_answer", { length: 1 }),
    explanation: text("explanation"),
    annulled: boolean("annulled").default(false).notNull(),
    version: integer("version").default(1).notNull(),
    verificationStatus: verificationStatusEnum("verification_status")
      .default("UNVERIFIED")
      .notNull(),
    source: text("source"),
    sourceUrl: text("source_url"),
    sourcePage: integer("source_page"),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: text("deleted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("questions_exam_number_active_unique")
      .on(table.examId, table.number)
      .where(sql`${table.deletedAt} is null`),
    index("questions_catalog_idx").on(
      table.status,
      table.examId,
      table.subjectId,
      table.number,
    ),
    index("questions_subject_status_idx").on(table.subjectId, table.status),
    check("questions_number_positive", sql`${table.number} > 0`),
    check("questions_version_positive", sql`${table.version} > 0`),
    check(
      "questions_options_is_object",
      sql`jsonb_typeof(${table.options}) = 'object'`,
    ),
    check(
      "questions_answer_valid",
      sql`${table.correctAnswer} is null or ${table.correctAnswer} in ('A', 'B', 'C', 'D', 'E')`,
    ),
    check(
      "questions_annulled_has_no_answer",
      sql`not ${table.annulled} or ${table.correctAnswer} is null`,
    ),
  ],
);

export const billingOrders = pgTable(
  "billing_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    plan: planCodeEnum("plan").notNull(),
    kind: billingOrderKindEnum("kind").notNull(),
    status: billingOrderStatusEnum("status").default("PENDING").notNull(),
    provider: varchar("provider", { length: 40 }).default("abacatepay").notNull(),
    externalId: text("external_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    checkoutUrl: text("checkout_url"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<JsonObject>().default(sql`'{}'::jsonb`).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("billing_orders_provider_external_unique").on(
      table.provider,
      table.externalId,
    ),
    index("billing_orders_user_created_at_idx").on(table.userId, table.createdAt),
    index("billing_orders_status_created_at_idx").on(table.status, table.createdAt),
    check("billing_orders_amount_positive", sql`${table.amountCents} > 0`),
    check("billing_orders_currency_upper", sql`${table.currency} = upper(${table.currency})`),
    check(
      "billing_orders_plan_kind_valid",
      sql`(${table.plan} in ('MONTHLY', 'ANNUAL') and ${table.kind} = 'SUBSCRIPTION') or (${table.plan} = 'LIFETIME' and ${table.kind} = 'ONE_TIME')`,
    ),
  ],
);

export const billingSubscriptions = pgTable(
  "billing_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    plan: planCodeEnum("plan").notNull(),
    provider: varchar("provider", { length: 40 }).default("abacatepay").notNull(),
    externalId: text("external_id"),
    status: billingSubscriptionStatusEnum("status").default("PENDING").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    lastProviderEventAt: timestamp("last_provider_event_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<JsonObject>().default(sql`'{}'::jsonb`).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("billing_subscriptions_provider_external_unique").on(
      table.provider,
      table.externalId,
    ),
    index("billing_subscriptions_user_status_idx").on(table.userId, table.status),
    index("billing_subscriptions_status_period_end_idx").on(
      table.status,
      table.currentPeriodEnd,
    ),
    check(
      "billing_subscriptions_recurring_plan",
      sql`${table.plan} in ('MONTHLY', 'ANNUAL')`,
    ),
    check(
      "billing_subscriptions_period_valid",
      sql`(${table.currentPeriodStart} is null and ${table.currentPeriodEnd} is null) or (${table.currentPeriodStart} is not null and ${table.currentPeriodEnd} is not null and ${table.currentPeriodEnd} > ${table.currentPeriodStart})`,
    ),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: varchar("provider", { length: 40 }).default("abacatepay").notNull(),
    externalEventId: text("external_event_id"),
    payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    payload: jsonb("payload").$type<JsonObject>().notNull(),
    status: webhookStatusEnum("status").default("RECEIVED").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
  },
  (table) => [
    uniqueIndex("webhook_events_provider_external_unique").on(
      table.provider,
      table.externalEventId,
    ),
    uniqueIndex("webhook_events_provider_payload_unique").on(
      table.provider,
      table.payloadHash,
    ),
    index("webhook_events_status_received_at_idx").on(table.status, table.receivedAt),
    check("webhook_events_attempt_nonnegative", sql`${table.attemptCount} >= 0`),
  ],
);

export const accessGrants = pgTable(
  "access_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    plan: planCodeEnum("plan").notNull(),
    source: accessGrantSourceEnum("source").notNull(),
    billingOrderId: uuid("billing_order_id").references(() => billingOrders.id, {
      onDelete: "restrict",
    }),
    billingSubscriptionId: uuid("billing_subscription_id").references(
      () => billingSubscriptions.id,
      { onDelete: "restrict" },
    ),
    grantedByUserId: text("granted_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByUserId: text("revoked_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    revocationReason: text("revocation_reason"),
    note: text("note"),
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("access_grants_subscription_unique")
      .on(table.billingSubscriptionId)
      .where(sql`${table.billingSubscriptionId} is not null`),
    uniqueIndex("access_grants_purchase_unique")
      .on(table.billingOrderId)
      .where(sql`${table.billingOrderId} is not null`),
    uniqueIndex("access_grants_default_active_unique")
      .on(table.userId)
      .where(sql`${table.source} = 'FREE' and ${table.revokedAt} is null`),
    index("access_grants_user_active_idx").on(
      table.userId,
      table.revokedAt,
      table.startsAt,
      table.endsAt,
    ),
    check(
      "access_grants_dates_valid",
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "access_grants_plan_duration_valid",
      sql`(${table.plan} in ('FREE', 'LIFETIME') and ${table.endsAt} is null) or (${table.plan} in ('MONTHLY', 'ANNUAL') and ${table.endsAt} is not null)`,
    ),
    check(
      "access_grants_source_links_valid",
      sql`
        (${table.source} = 'FREE' and ${table.plan} = 'FREE' and ${table.billingOrderId} is null and ${table.billingSubscriptionId} is null and ${table.grantedByUserId} is null)
        or (${table.source} = 'SUBSCRIPTION' and ${table.plan} in ('MONTHLY', 'ANNUAL') and ${table.billingSubscriptionId} is not null and ${table.billingOrderId} is null and ${table.grantedByUserId} is null)
        or (${table.source} = 'PURCHASE' and ${table.plan} in ('MONTHLY', 'ANNUAL', 'LIFETIME') and ${table.billingOrderId} is not null and ${table.billingSubscriptionId} is null and ${table.grantedByUserId} is null)
        or (${table.source} in ('GIFT', 'ADMIN') and ${table.plan} <> 'FREE' and ${table.billingOrderId} is null and ${table.billingSubscriptionId} is null and ${table.grantedByUserId} is not null)
      `,
    ),
    check(
      "access_grants_revocation_valid",
      sql`${table.revokedAt} is null or (${table.revocationReason} is not null and (${table.revokedByUserId} is not null or ${table.source} in ('SUBSCRIPTION', 'PURCHASE')))`,
    ),
  ],
);

export const simulations = pgTable(
  "simulations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    access: simulationAccessEnum("access").default("FULL_ACCESS").notNull(),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    durationMinutes: integer("duration_minutes"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("simulations_single_free_published_unique")
      .on(table.access)
      .where(
        sql`${table.access} = 'FREE' and ${table.status} = 'PUBLISHED' and ${table.deletedAt} is null`,
      ),
    index("simulations_catalog_idx").on(table.status, table.access, table.publishedAt),
    check(
      "simulations_duration_positive",
      sql`${table.durationMinutes} is null or ${table.durationMinutes} > 0`,
    ),
  ],
);

export const simulationQuestions = pgTable(
  "simulation_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    simulationId: uuid("simulation_id")
      .notNull()
      .references(() => simulations.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("simulation_questions_position_unique").on(
      table.simulationId,
      table.position,
    ),
    uniqueIndex("simulation_questions_question_unique").on(
      table.simulationId,
      table.questionId,
    ),
    index("simulation_questions_order_idx").on(table.simulationId, table.position),
    check("simulation_questions_position_positive", sql`${table.position} > 0`),
  ],
);

export const simulationAttempts = pgTable(
  "simulation_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    simulationId: uuid("simulation_id")
      .notNull()
      .references(() => simulations.id, { onDelete: "restrict" }),
    status: attemptStatusEnum("status").default("IN_PROGRESS").notNull(),
    freeAccessClaim: boolean("free_access_claim").default(false).notNull(),
    totalQuestions: integer("total_questions").notNull(),
    correctAnswers: integer("correct_answers"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    pausedClockSeconds: integer("paused_clock_seconds"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    abandonedAt: timestamp("abandoned_at", { withTimezone: true }),
    clientRequestId: text("client_request_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("simulation_attempts_user_request_unique").on(
      table.userId,
      table.clientRequestId,
    ),
    uniqueIndex("simulation_attempts_one_free_claim_per_user_unique")
      .on(table.userId)
      .where(sql`${table.freeAccessClaim} = true`),
    index("simulation_attempts_user_started_idx").on(table.userId, table.startedAt),
    index("simulation_attempts_simulation_status_idx").on(
      table.simulationId,
      table.status,
    ),
    check("simulation_attempts_total_positive", sql`${table.totalQuestions} > 0`),
    check(
      "simulation_attempts_paused_clock_nonnegative",
      sql`${table.pausedClockSeconds} is null or ${table.pausedClockSeconds} >= 0`,
    ),
    check(
      "simulation_attempts_pause_consistent",
      sql`(${table.pausedAt} is null) = (${table.pausedClockSeconds} is null)`,
    ),
    check(
      "simulation_attempts_score_valid",
      sql`${table.correctAnswers} is null or (${table.correctAnswers} >= 0 and ${table.correctAnswers} <= ${table.totalQuestions})`,
    ),
  ],
);

// Immutable question/order snapshot. Answers live separately, so answering
// never mutates the identifiers or the ordering captured at attempt creation.
export const simulationAttemptQuestions = pgTable(
  "simulation_attempt_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => simulationAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    snapshot: jsonb("snapshot").$type<AttemptQuestionSnapshot>().notNull(),
    correctAnswerSnapshot: varchar("correct_answer_snapshot", { length: 1 }),
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("simulation_attempt_questions_position_unique").on(
      table.attemptId,
      table.position,
    ),
    uniqueIndex("simulation_attempt_questions_question_unique").on(
      table.attemptId,
      table.questionId,
    ),
    index("simulation_attempt_questions_order_idx").on(table.attemptId, table.position),
    check("simulation_attempt_questions_position_positive", sql`${table.position} > 0`),
    check(
      "simulation_attempt_questions_answer_valid",
      sql`${table.correctAnswerSnapshot} is null or ${table.correctAnswerSnapshot} in ('A', 'B', 'C', 'D', 'E')`,
    ),
  ],
);

export const simulationAnswers = pgTable(
  "simulation_answers",
  {
    attemptQuestionId: uuid("attempt_question_id")
      .primaryKey()
      .references(() => simulationAttemptQuestions.id, { onDelete: "cascade" }),
    selectedAnswer: varchar("selected_answer", { length: 1 }).notNull(),
    isCorrect: boolean("is_correct").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "simulation_answers_selected_valid",
      sql`${table.selectedAnswer} in ('A', 'B', 'C', 'D', 'E')`,
    ),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.questionId] }),
    index("favorites_question_idx").on(table.questionId),
    index("favorites_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const studyActivities = pgTable(
  "study_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    type: studyActivityTypeEnum("type").default("CUSTOM").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    estimatedMinutes: integer("estimated_minutes"),
    targetQuestions: integer("target_questions"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("study_activities_user_schedule_idx").on(table.userId, table.scheduledAt),
    check(
      "study_activities_minutes_positive",
      sql`${table.estimatedMinutes} is null or ${table.estimatedMinutes} > 0`,
    ),
    check(
      "study_activities_questions_positive",
      sql`${table.targetQuestions} is null or ${table.targetQuestions} > 0`,
    ),
  ],
);

export const studyGoals = pgTable(
  "study_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    metric: studyGoalMetricEnum("metric").notNull(),
    period: studyGoalPeriodEnum("period").notNull(),
    targetValue: integer("target_value").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("study_goals_user_active_idx").on(table.userId, table.isActive),
    check("study_goals_target_positive", sql`${table.targetValue} > 0`),
    check(
      "study_goals_dates_valid",
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const questionStudyStates = pgTable(
  "question_study_states",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    errorNote: text("error_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    reviewCycleDays: integer("review_cycle_days").default(1).notNull(),
    removedFromErrorsAt: timestamp("removed_from_errors_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.questionId] }),
    index("question_study_states_review_idx").on(table.userId, table.nextReviewAt),
    check(
      "question_study_states_cycle_valid",
      sql`${table.reviewCycleDays} in (1, 7, 15, 30)`,
    ),
  ],
);

export const studyNotes = pgTable(
  "study_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    questionId: uuid("question_id").references(() => questions.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 180 }).notNull(),
    content: text("content").notNull(),
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    isFavorite: boolean("is_favorite").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("study_notes_user_updated_idx").on(table.userId, table.updatedAt),
    index("study_notes_user_subject_idx").on(table.userId, table.subjectId),
  ],
);

export const dailyStudyCompletions = pgTable(
  "daily_study_completions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dateKey: date("date_key").notNull(),
    itemKey: varchar("item_key", { length: 120 }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.dateKey, table.itemKey] }),
    index("daily_study_completions_user_date_idx").on(table.userId, table.dateKey),
  ],
);

export type StudyPlanSchedule = Array<{
  weekday: number;
  blocks: Array<{
    kind: "THEORY" | "QUESTIONS" | "REVIEW" | "SIMULATION";
    subject: string;
    minutes: number;
  }>;
}>;

export const studyPlans = pgTable(
  "study_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    examDate: date("exam_date").notNull(),
    daysPerWeek: integer("days_per_week").notNull(),
    minutesPerDay: integer("minutes_per_day").notNull(),
    currentLevel: varchar("current_level", { length: 30 }).notNull(),
    difficultSubjectIds: jsonb("difficult_subject_ids")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    schedule: jsonb("schedule").$type<StudyPlanSchedule>().notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    ...timestamps(),
  },
  (table) => [
    check(
      "study_plans_days_valid",
      sql`${table.daysPerWeek} between 1 and 7`,
    ),
    check(
      "study_plans_minutes_valid",
      sql`${table.minutesPerDay} between 15 and 720`,
    ),
  ],
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 220 }).notNull(),
    body: text("body").notNull(),
    audience: announcementAudienceEnum("audience").default("ALL").notNull(),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    dismissible: boolean("dismissible").default(true).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (table) => [
    index("announcements_active_idx").on(table.status, table.startsAt, table.endsAt),
    check(
      "announcements_dates_valid",
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const announcementReceipts = pgTable(
  "announcement_receipts",
  {
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    seenAt: timestamp("seen_at", { withTimezone: true }).defaultNow().notNull(),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.announcementId, table.userId] }),
    index("announcement_receipts_user_idx").on(table.userId, table.seenAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorType: auditActorTypeEnum("actor_type").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: text("entity_id").notNull(),
    beforeData: jsonb("before_data").$type<JsonObject>(),
    afterData: jsonb("after_data").$type<JsonObject>(),
    reason: text("reason"),
    requestId: text("request_id"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt),
    index("audit_logs_entity_created_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    index("audit_logs_created_at_idx").on(table.createdAt),
    check(
      "audit_logs_user_actor_has_user",
      sql`${table.actorType} <> 'USER' or ${table.actorUserId} is not null`,
    ),
  ],
);

export const authSchema = { user, session, account, verification };

export const schema = {
  ...authSchema,
  subjects,
  exams,
  questions,
  billingOrders,
  billingSubscriptions,
  webhookEvents,
  accessGrants,
  simulations,
  simulationQuestions,
  simulationAttempts,
  simulationAttemptQuestions,
  simulationAnswers,
  favorites,
  studyActivities,
  studyGoals,
  questionStudyStates,
  studyNotes,
  dailyStudyCompletions,
  studyPlans,
  announcements,
  announcementReceipts,
  auditLogs,
};

export type AuthUser = typeof user.$inferSelect;
export type NewAuthUser = typeof user.$inferInsert;
export type AccessGrant = typeof accessGrants.$inferSelect;
export type NewAccessGrant = typeof accessGrants.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Simulation = typeof simulations.$inferSelect;
export type SimulationAttempt = typeof simulationAttempts.$inferSelect;
export type BillingOrder = typeof billingOrders.$inferSelect;
export type BillingSubscription = typeof billingSubscriptions.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
