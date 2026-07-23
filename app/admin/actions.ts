"use server";

import { and, count, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  accessGrants,
  announcements,
  auditLogs,
  questions,
  session,
  user,
  type JsonObject,
  type PlanCode,
} from "@/db/schema";
import {
  announcementInputSchema,
  giftAccessInputSchema,
  questionInputSchema,
  roleInputSchema,
} from "@/lib/validation";
import { requireAdmin } from "@/lib/session";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function auditEntry(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: JsonObject;
  afterData?: JsonObject;
  reason?: string;
}) {
  return {
    actorType: "USER" as const,
    requestId: crypto.randomUUID(),
    ...input,
  };
}

function messageRedirect(path: string, type: "sucesso" | "erro", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export async function changeUserRoleAction(formData: FormData) {
  const administrator = await requireAdmin();
  const parsed = roleInputSchema.safeParse({
    userId: stringValue(formData, "userId"),
    role: stringValue(formData, "role"),
  });
  if (!parsed.success) messageRedirect("/admin/usuarios", "erro", "Alteração de função inválida.");
  if (parsed.data.userId === administrator.user.id) {
    messageRedirect("/admin/usuarios", "erro", "Você não pode alterar a própria função.");
  }

  const database = getDb();
  const targetRows = await database
    .select({ id: user.id, role: user.role, name: user.name })
    .from(user)
    .where(and(eq(user.id, parsed.data.userId), isNull(user.deletedAt)))
    .limit(1);
  const target = targetRows[0];
  if (!target) messageRedirect("/admin/usuarios", "erro", "Usuário não encontrado.");
  if (target.role === parsed.data.role) {
    messageRedirect(`/admin/usuarios/${target.id}`, "sucesso", "A função já estava atualizada.");
  }

  if (target.role === "admin" && parsed.data.role === "user") {
    const adminTotals = await database
      .select({ total: count() })
      .from(user)
      .where(and(eq(user.role, "admin"), eq(user.status, "ACTIVE"), isNull(user.deletedAt)));
    if (Number(adminTotals[0]?.total ?? 0) <= 1) {
      messageRedirect("/admin/usuarios", "erro", "O último administrador não pode ser rebaixado.");
    }
  }

  await database.batch([
    database
      .update(user)
      .set({ role: parsed.data.role, authVersion: sql`${user.authVersion} + 1` })
      .where(eq(user.id, target.id)),
    database.delete(session).where(eq(session.userId, target.id)),
    database.insert(auditLogs).values(
      auditEntry({
        actorUserId: administrator.user.id,
        action: parsed.data.role === "admin" ? "USER_PROMOTED" : "USER_DEMOTED",
        entityType: "user",
        entityId: target.id,
        beforeData: { role: target.role },
        afterData: { role: parsed.data.role },
      }),
    ),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  messageRedirect(`/admin/usuarios/${target.id}`, "sucesso", "Função atualizada e sessões antigas revogadas.");
}

const statusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().trim().min(3).max(500),
});

export async function changeUserStatusAction(formData: FormData) {
  const administrator = await requireAdmin();
  const parsed = statusSchema.safeParse({
    userId: stringValue(formData, "userId"),
    status: stringValue(formData, "status"),
    reason: stringValue(formData, "reason"),
  });
  if (!parsed.success) messageRedirect("/admin/usuarios", "erro", "Informe um motivo válido.");
  if (parsed.data.userId === administrator.user.id) {
    messageRedirect("/admin/usuarios", "erro", "Você não pode suspender a própria conta.");
  }

  const database = getDb();
  const targetRows = await database
    .select({ id: user.id, status: user.status, banned: user.banned })
    .from(user)
    .where(eq(user.id, parsed.data.userId))
    .limit(1);
  const target = targetRows[0];
  if (!target) messageRedirect("/admin/usuarios", "erro", "Usuário não encontrado.");

  const suspended = parsed.data.status === "SUSPENDED";
  await database.batch([
    database
      .update(user)
      .set({
        status: parsed.data.status,
        banned: suspended,
        banReason: suspended ? parsed.data.reason : null,
        banExpires: null,
        authVersion: sql`${user.authVersion} + 1`,
      })
      .where(eq(user.id, target.id)),
    database.delete(session).where(eq(session.userId, target.id)),
    database.insert(auditLogs).values(
      auditEntry({
        actorUserId: administrator.user.id,
        action: suspended ? "USER_SUSPENDED" : "USER_REACTIVATED",
        entityType: "user",
        entityId: target.id,
        beforeData: { status: target.status, banned: target.banned },
        afterData: { status: parsed.data.status, banned: suspended },
        reason: parsed.data.reason,
      }),
    ),
  ]);

  revalidatePath("/admin/usuarios");
  messageRedirect(`/admin/usuarios/${target.id}`, "sucesso", suspended ? "Usuário suspenso." : "Usuário reativado.");
}

export async function grantGiftAccessAction(formData: FormData) {
  const administrator = await requireAdmin();
  const durationValue = stringValue(formData, "durationDays");
  const parsed = giftAccessInputSchema.safeParse({
    userId: stringValue(formData, "userId"),
    planCode: stringValue(formData, "planCode"),
    durationDays: durationValue ? Number(durationValue) : null,
    reason: stringValue(formData, "reason"),
  });
  if (!parsed.success) messageRedirect("/admin/usuarios", "erro", "Concessão de presente inválida.");

  const plan = parsed.data.planCode.toUpperCase() as PlanCode;
  const defaultDays = plan === "MONTHLY" ? 30 : plan === "ANNUAL" ? 365 : null;
  const durationDays = plan === "LIFETIME" ? null : parsed.data.durationDays ?? defaultDays;
  const startsAt = new Date();
  const endsAt = durationDays
    ? new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1_000)
    : null;
  const grantId = crypto.randomUUID();
  const database = getDb();

  const target = await database.select({ id: user.id }).from(user).where(eq(user.id, parsed.data.userId)).limit(1);
  if (!target[0]) messageRedirect("/admin/usuarios", "erro", "Usuário não encontrado.");

  await database.batch([
    database.insert(accessGrants).values({
      id: grantId,
      userId: parsed.data.userId,
      plan,
      source: "GIFT",
      grantedByUserId: administrator.user.id,
      startsAt,
      endsAt,
      note: parsed.data.reason,
      idempotencyKey: `gift:${grantId}`,
    }),
    database.insert(auditLogs).values(
      auditEntry({
        actorUserId: administrator.user.id,
        action: "GIFT_GRANTED",
        entityType: "access_grant",
        entityId: grantId,
        afterData: { userId: parsed.data.userId, plan, startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null },
        reason: parsed.data.reason,
      }),
    ),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  messageRedirect(`/admin/usuarios/${parsed.data.userId}`, "sucesso", "Acesso presente concedido.");
}

const revokeGrantSchema = z.object({
  grantId: z.string().uuid(),
  userId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
});

export async function revokeGiftAccessAction(formData: FormData) {
  const administrator = await requireAdmin();
  const parsed = revokeGrantSchema.safeParse({
    grantId: stringValue(formData, "grantId"),
    userId: stringValue(formData, "userId"),
    reason: stringValue(formData, "reason"),
  });
  if (!parsed.success) messageRedirect("/admin/usuarios", "erro", "Revogação inválida.");

  const database = getDb();
  const grantRows = await database
    .select({ id: accessGrants.id, source: accessGrants.source, revokedAt: accessGrants.revokedAt })
    .from(accessGrants)
    .where(and(eq(accessGrants.id, parsed.data.grantId), eq(accessGrants.userId, parsed.data.userId)))
    .limit(1);
  const grant = grantRows[0];
  if (!grant || !["GIFT", "ADMIN"].includes(grant.source)) {
    messageRedirect(`/admin/usuarios/${parsed.data.userId}`, "erro", "Somente acessos manuais podem ser revogados aqui.");
  }
  if (grant.revokedAt) {
    messageRedirect(`/admin/usuarios/${parsed.data.userId}`, "erro", "Este acesso já foi revogado.");
  }

  const revokedAt = new Date();
  await database.batch([
    database
      .update(accessGrants)
      .set({
        revokedAt,
        revokedByUserId: administrator.user.id,
        revocationReason: parsed.data.reason,
      })
      .where(eq(accessGrants.id, grant.id)),
    database.insert(auditLogs).values(
      auditEntry({
        actorUserId: administrator.user.id,
        action: "GIFT_REVOKED",
        entityType: "access_grant",
        entityId: grant.id,
        afterData: { revokedAt: revokedAt.toISOString() },
        reason: parsed.data.reason,
      }),
    ),
  ]);

  revalidatePath("/admin/usuarios");
  messageRedirect(`/admin/usuarios/${parsed.data.userId}`, "sucesso", "Acesso presente revogado.");
}

export async function saveAnnouncementAction(formData: FormData) {
  const administrator = await requireAdmin();
  const id = stringValue(formData, "id") || undefined;
  const parsed = announcementInputSchema.safeParse({
    id,
    title: stringValue(formData, "title"),
    body: stringValue(formData, "body"),
    status: stringValue(formData, "status"),
    audience: stringValue(formData, "audience"),
    dismissible: formData.get("dismissible") === "on",
    startsAt: stringValue(formData, "startsAt") || undefined,
    endsAt: stringValue(formData, "endsAt") || undefined,
  });
  if (!parsed.success) messageRedirect("/admin/comunicados", "erro", parsed.error.issues[0]?.message ?? "Comunicado inválido.");

  const database = getDb();
  const announcementId = parsed.data.id ?? crypto.randomUUID();
  const status = parsed.data.status.toUpperCase() as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  const audience = parsed.data.audience.toUpperCase() as "ALL" | "FREE" | "FULL_ACCESS";
  const values = {
    title: parsed.data.title,
    body: parsed.data.body,
    status,
    audience,
    dismissible: parsed.data.dismissible,
    startsAt: parsed.data.startsAt ?? new Date(),
    endsAt: parsed.data.endsAt,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
    updatedByUserId: administrator.user.id,
  };

  if (parsed.data.id) {
    await database.batch([
      database.update(announcements).set(values).where(eq(announcements.id, announcementId)),
      database.insert(auditLogs).values(
        auditEntry({ actorUserId: administrator.user.id, action: "ANNOUNCEMENT_UPDATED", entityType: "announcement", entityId: announcementId, afterData: { title: values.title, status, audience } }),
      ),
    ]);
  } else {
    await database.batch([
      database.insert(announcements).values({ id: announcementId, ...values, createdByUserId: administrator.user.id }),
      database.insert(auditLogs).values(
        auditEntry({ actorUserId: administrator.user.id, action: "ANNOUNCEMENT_CREATED", entityType: "announcement", entityId: announcementId, afterData: { title: values.title, status, audience } }),
      ),
    ]);
  }

  revalidatePath("/admin/comunicados");
  revalidatePath("/painel", "layout");
  messageRedirect("/admin/comunicados", "sucesso", "Comunicado salvo.");
}

export async function archiveAnnouncementAction(formData: FormData) {
  const administrator = await requireAdmin();
  const id = z.string().uuid().safeParse(stringValue(formData, "id"));
  if (!id.success) messageRedirect("/admin/comunicados", "erro", "Comunicado inválido.");

  await getDb().batch([
    getDb().update(announcements).set({ status: "ARCHIVED", updatedByUserId: administrator.user.id }).where(eq(announcements.id, id.data)),
    getDb().insert(auditLogs).values(
      auditEntry({ actorUserId: administrator.user.id, action: "ANNOUNCEMENT_ARCHIVED", entityType: "announcement", entityId: id.data }),
    ),
  ]);
  revalidatePath("/admin/comunicados");
  revalidatePath("/painel", "layout");
  messageRedirect("/admin/comunicados", "sucesso", "Comunicado arquivado.");
}

export async function saveQuestionAction(formData: FormData) {
  const administrator = await requireAdmin();
  const id = stringValue(formData, "id") || undefined;
  const annulled = formData.get("annulled") === "on";
  const parsed = questionInputSchema.safeParse({
    id,
    legacyKey: stringValue(formData, "externalId") || null,
    examId: stringValue(formData, "examId"),
    subjectId: stringValue(formData, "subjectId"),
    number: stringValue(formData, "number"),
    stem: stringValue(formData, "statement"),
    options: ["A", "B", "C", "D"].map((label) => ({ label, text: stringValue(formData, `option${label}`) })),
    correctAnswer: annulled ? null : stringValue(formData, "correctAnswer") || null,
    annulled,
    explanation: stringValue(formData, "explanation") || null,
    sourceLabel: stringValue(formData, "source"),
    sourceUrl: stringValue(formData, "sourceUrl") || null,
    status: stringValue(formData, "status"),
    verificationStatus: stringValue(formData, "verificationStatus"),
  });
  if (!parsed.success) messageRedirect(id ? `/admin/questoes/${id}/editar` : "/admin/questoes/nova", "erro", parsed.error.issues[0]?.message ?? "Questão inválida.");

  const database = getDb();
  const questionId = parsed.data.id ?? crypto.randomUUID();
  const externalId = parsed.data.legacyKey || `manual-${questionId.slice(0, 8)}`;
  const status = parsed.data.status.toUpperCase() as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  const verificationStatus = parsed.data.verificationStatus.toUpperCase() as "UNVERIFIED" | "VERIFIED" | "REJECTED";
  const values = {
    externalId,
    examId: parsed.data.examId,
    subjectId: parsed.data.subjectId,
    number: parsed.data.number,
    statement: parsed.data.stem,
    options: Object.fromEntries(parsed.data.options.map((option) => [option.label, option.text])),
    correctAnswer: parsed.data.correctAnswer,
    annulled: parsed.data.annulled,
    explanation: parsed.data.explanation,
    source: parsed.data.sourceLabel,
    sourceUrl: parsed.data.sourceUrl || null,
    status,
    verificationStatus,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
    updatedByUserId: administrator.user.id,
  };

  if (parsed.data.id) {
    await database.batch([
      database.update(questions).set({ ...values, version: sql`${questions.version} + 1` }).where(eq(questions.id, questionId)),
      database.insert(auditLogs).values(
        auditEntry({ actorUserId: administrator.user.id, action: "QUESTION_UPDATED", entityType: "question", entityId: questionId, afterData: { externalId, status, verificationStatus } }),
      ),
    ]);
  } else {
    await database.batch([
      database.insert(questions).values({ id: questionId, ...values, createdByUserId: administrator.user.id }),
      database.insert(auditLogs).values(
        auditEntry({ actorUserId: administrator.user.id, action: "QUESTION_CREATED", entityType: "question", entityId: questionId, afterData: { externalId, status, verificationStatus } }),
      ),
    ]);
  }

  revalidatePath("/admin/questoes");
  revalidatePath("/questoes");
  messageRedirect("/admin/questoes", "sucesso", "Questão salva.");
}

export async function deleteQuestionAction(formData: FormData) {
  const administrator = await requireAdmin();
  const parsed = z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).safeParse({
    id: stringValue(formData, "id"),
    reason: stringValue(formData, "reason"),
  });
  if (!parsed.success) messageRedirect("/admin/questoes", "erro", "Informe um motivo para excluir.");

  const deletedAt = new Date();
  await getDb().batch([
    getDb().update(questions).set({ status: "ARCHIVED", deletedAt, deletedByUserId: administrator.user.id }).where(eq(questions.id, parsed.data.id)),
    getDb().insert(auditLogs).values(
      auditEntry({ actorUserId: administrator.user.id, action: "QUESTION_DELETED", entityType: "question", entityId: parsed.data.id, afterData: { deletedAt: deletedAt.toISOString() }, reason: parsed.data.reason }),
    ),
  ]);
  revalidatePath("/admin/questoes");
  revalidatePath("/questoes");
  messageRedirect("/admin/questoes", "sucesso", "Questão excluída do catálogo; tentativas antigas foram preservadas.");
}
