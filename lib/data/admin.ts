import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  accessGrants,
  announcements,
  auditLogs,
  billingOrders,
  billingSubscriptions,
  exams,
  questions,
  simulationAttempts,
  subjects,
  user,
  type UserRole,
  type UserStatus,
} from "@/db/schema";
import { resolveAccess } from "@/lib/access";
import { ADMIN_PAGE_SIZE, getOffset, normalizePage } from "@/lib/pagination";

export type UserAccessFilter = "all" | "free" | "full" | "paying" | "gift";

export type AdminUserFilters = {
  page?: string | number;
  query?: string;
  role?: "all" | UserRole;
  status?: "all" | UserStatus;
  access?: UserAccessFilter;
};

const qualifiedUserId = sql.raw('"user"."id"');

function activeGrantSql() {
  return sql`ag.revoked_at is null and ag.starts_at <= now() and (ag.ends_at is null or ag.ends_at > now())`;
}

function accessCondition(filter: UserAccessFilter) {
  const fullGrant = sql`exists (
    select 1 from access_grants ag
    where ag.user_id = ${qualifiedUserId}
      and ${activeGrantSql()}
      and ag.plan <> 'FREE'
  )`;

  if (filter === "free") return sql`not (${fullGrant})`;
  if (filter === "full") return fullGrant;
  if (filter === "paying") {
    return sql`exists (
      select 1 from access_grants ag
      where ag.user_id = ${qualifiedUserId}
        and ${activeGrantSql()}
        and ag.source in ('SUBSCRIPTION', 'PURCHASE')
        and ag.plan <> 'FREE'
    )`;
  }
  if (filter === "gift") {
    return sql`exists (
      select 1 from access_grants ag
      where ag.user_id = ${qualifiedUserId}
        and ${activeGrantSql()}
        and ag.source in ('GIFT', 'ADMIN')
        and ag.plan <> 'FREE'
    )`;
  }
  return undefined;
}

export async function getAdminMetrics() {
  const database = getDb();

  const [userMetrics, questionMetrics, announcementMetrics, attemptMetrics] = await Promise.all([
    database
      .select({
        total: count(),
        admins: sql<number>`count(*) filter (where ${user.role} = 'admin')`,
        paying: sql<number>`count(*) filter (where exists (
          select 1 from access_grants ag
          where ag.user_id = ${qualifiedUserId}
            and ag.revoked_at is null
            and ag.starts_at <= now()
            and (ag.ends_at is null or ag.ends_at > now())
            and ag.source in ('SUBSCRIPTION', 'PURCHASE')
            and ag.plan <> 'FREE'
        ))`,
        fullAccess: sql<number>`count(*) filter (where exists (
          select 1 from access_grants ag
          where ag.user_id = ${qualifiedUserId}
            and ag.revoked_at is null
            and ag.starts_at <= now()
            and (ag.ends_at is null or ag.ends_at > now())
            and ag.plan <> 'FREE'
        ))`,
      })
      .from(user)
      .where(isNull(user.deletedAt)),
    database
      .select({ total: count() })
      .from(questions)
      .where(isNull(questions.deletedAt)),
    database
      .select({ published: count() })
      .from(announcements)
      .where(eq(announcements.status, "PUBLISHED")),
    database.select({ total: count() }).from(simulationAttempts),
  ]);

  return {
    users: Number(userMetrics[0]?.total ?? 0),
    admins: Number(userMetrics[0]?.admins ?? 0),
    payingUsers: Number(userMetrics[0]?.paying ?? 0),
    fullAccessUsers: Number(userMetrics[0]?.fullAccess ?? 0),
    questions: Number(questionMetrics[0]?.total ?? 0),
    publishedAnnouncements: Number(announcementMetrics[0]?.published ?? 0),
    attempts: Number(attemptMetrics[0]?.total ?? 0),
  };
}

export async function listAdminUsers(filters: AdminUserFilters = {}) {
  const database = getDb();
  const page = normalizePage(filters.page);
  const query = filters.query?.trim() ?? "";
  const access = filters.access ?? "all";
  const conditions = [isNull(user.deletedAt)];

  if (query) {
    conditions.push(or(ilike(user.name, `%${query}%`), ilike(user.email, `%${query}%`))!);
  }
  if (filters.role && filters.role !== "all") conditions.push(eq(user.role, filters.role));
  if (filters.status && filters.status !== "all") conditions.push(eq(user.status, filters.status));

  const accessSql = accessCondition(access);
  if (accessSql) conditions.push(accessSql);

  const where = and(...conditions);
  const [rows, totalRows] = await Promise.all([
    database
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        status: user.status,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(ADMIN_PAGE_SIZE)
      .offset(getOffset(page)),
    database.select({ total: count() }).from(user).where(where),
  ]);

  const userIds = rows.map((row) => row.id);
  const grants = userIds.length
    ? await database
        .select({
          id: accessGrants.id,
          userId: accessGrants.userId,
          plan: accessGrants.plan,
          source: accessGrants.source,
          startsAt: accessGrants.startsAt,
          endsAt: accessGrants.endsAt,
          revokedAt: accessGrants.revokedAt,
        })
        .from(accessGrants)
        .where(inArray(accessGrants.userId, userIds))
    : [];

  return {
    users: rows.map((row) => {
      const accessSummary = resolveAccess(grants.filter((grant) => grant.userId === row.id));
      return { ...row, access: accessSummary };
    }),
    total: Number(totalRows[0]?.total ?? 0),
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export async function getAdminUser(userId: string) {
  const database = getDb();
  const [users, grants, orders, subscriptions, attemptCount] = await Promise.all([
    database.select().from(user).where(eq(user.id, userId)).limit(1),
    database
      .select()
      .from(accessGrants)
      .where(eq(accessGrants.userId, userId))
      .orderBy(desc(accessGrants.createdAt)),
    database
      .select()
      .from(billingOrders)
      .where(eq(billingOrders.userId, userId))
      .orderBy(desc(billingOrders.createdAt)),
    database
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.userId, userId))
      .orderBy(desc(billingSubscriptions.createdAt)),
    database
      .select({ total: count() })
      .from(simulationAttempts)
      .where(eq(simulationAttempts.userId, userId)),
  ]);

  if (!users[0] || users[0].deletedAt) return null;

  return {
    user: users[0],
    grants,
    access: resolveAccess(grants),
    orders,
    subscriptions,
    attemptCount: Number(attemptCount[0]?.total ?? 0),
  };
}

export type AdminQuestionFilters = {
  page?: string | number;
  query?: string;
  status?: "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
  verification?: "all" | "UNVERIFIED" | "VERIFIED" | "REJECTED";
};

export async function listAdminQuestions(filters: AdminQuestionFilters = {}) {
  const database = getDb();
  const page = normalizePage(filters.page);
  const query = filters.query?.trim() ?? "";
  const conditions = [isNull(questions.deletedAt)];

  if (query) {
    conditions.push(
      or(ilike(questions.statement, `%${query}%`), ilike(questions.externalId, `%${query}%`))!,
    );
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(questions.status, filters.status));
  }
  if (filters.verification && filters.verification !== "all") {
    conditions.push(eq(questions.verificationStatus, filters.verification));
  }

  const where = and(...conditions);
  const [rows, totals] = await Promise.all([
    database
      .select({
        id: questions.id,
        externalId: questions.externalId,
        number: questions.number,
        statement: questions.statement,
        status: questions.status,
        verificationStatus: questions.verificationStatus,
        annulled: questions.annulled,
        version: questions.version,
        exam: exams.title,
        subject: subjects.name,
        updatedAt: questions.updatedAt,
      })
      .from(questions)
      .innerJoin(exams, eq(exams.id, questions.examId))
      .innerJoin(subjects, eq(subjects.id, questions.subjectId))
      .where(where)
      .orderBy(desc(exams.edition), questions.number)
      .limit(ADMIN_PAGE_SIZE)
      .offset(getOffset(page)),
    database.select({ total: count() }).from(questions).where(where),
  ]);

  return {
    questions: rows,
    total: Number(totals[0]?.total ?? 0),
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export async function getQuestionEditorData(questionId?: string) {
  const database = getDb();
  const [subjectRows, examRows, questionRows] = await Promise.all([
    database.select().from(subjects).orderBy(subjects.displayOrder, subjects.name),
    database.select().from(exams).orderBy(desc(exams.edition)),
    questionId
      ? database.select().from(questions).where(eq(questions.id, questionId)).limit(1)
      : Promise.resolve([]),
  ]);

  return {
    subjects: subjectRows,
    exams: examRows,
    question: questionRows[0] ?? null,
  };
}

export async function listAnnouncements() {
  return getDb()
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));
}

export async function listManualAccessGrants() {
  const grantUser = user;
  return getDb()
    .select({
      id: accessGrants.id,
      userId: accessGrants.userId,
      userName: grantUser.name,
      userEmail: grantUser.email,
      plan: accessGrants.plan,
      source: accessGrants.source,
      startsAt: accessGrants.startsAt,
      endsAt: accessGrants.endsAt,
      revokedAt: accessGrants.revokedAt,
      note: accessGrants.note,
      grantedByUserId: accessGrants.grantedByUserId,
      createdAt: accessGrants.createdAt,
    })
    .from(accessGrants)
    .innerJoin(grantUser, eq(grantUser.id, accessGrants.userId))
    .where(inArray(accessGrants.source, ["GIFT", "ADMIN"]))
    .orderBy(desc(accessGrants.createdAt));
}

export async function listAuditLogs(pageValue?: string | number) {
  const database = getDb();
  const page = normalizePage(pageValue);
  const [logs, totals] = await Promise.all([
    database
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        reason: auditLogs.reason,
        createdAt: auditLogs.createdAt,
        actorName: user.name,
        actorEmail: user.email,
      })
      .from(auditLogs)
      .leftJoin(user, eq(user.id, auditLogs.actorUserId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset(getOffset(page)),
    database.select({ total: count() }).from(auditLogs),
  ]);

  return {
    logs,
    total: Number(totals[0]?.total ?? 0),
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}
