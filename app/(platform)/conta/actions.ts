"use server";

import { and, count, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import {
  accessGrants,
  account as authAccounts,
  announcementReceipts,
  auditLogs,
  favorites,
  session as authSessions,
  user,
  verification,
} from "@/db/schema";
import { requireUser } from "@/lib/session";

function accountError(message: string): never {
  redirect(`/conta?erro=${encodeURIComponent(message)}#excluir-conta`);
}

export async function deleteOwnAccountAction(formData: FormData) {
  const currentSession = await requireUser();
  const confirmation = formData.get("confirmation");
  const acknowledged = formData.get("acknowledged") === "on";

  if (!acknowledged || confirmation !== "EXCLUIR") {
    accountError(
      "Marque a confirmação e digite EXCLUIR para apagar sua conta.",
    );
  }

  const database = getDb();
  const targetRows = await database
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .where(
      and(
        eq(user.id, currentSession.user.id),
        isNull(user.deletedAt),
      ),
    )
    .limit(1);
  const target = targetRows[0];

  if (!target) {
    accountError("Esta conta não está mais ativa.");
  }

  if (target.role === "admin") {
    const administratorRows = await database
      .select({ total: count() })
      .from(user)
      .where(
        and(
          eq(user.role, "admin"),
          eq(user.status, "ACTIVE"),
          isNull(user.deletedAt),
        ),
      );

    if (Number(administratorRows[0]?.total ?? 0) <= 1) {
      accountError(
        "O último administrador não pode excluir a própria conta. Promova outro administrador primeiro.",
      );
    }
  }

  const deletedAt = new Date();
  const anonymizedEmail = `deleted-${crypto.randomUUID()}@users.invalid`;

  await database.batch([
    database
      .delete(authSessions)
      .where(eq(authSessions.userId, target.id)),
    database
      .delete(authAccounts)
      .where(eq(authAccounts.userId, target.id)),
    database
      .delete(verification)
      .where(eq(verification.identifier, target.email)),
    database.delete(favorites).where(eq(favorites.userId, target.id)),
    database
      .delete(announcementReceipts)
      .where(eq(announcementReceipts.userId, target.id)),
    database
      .update(accessGrants)
      .set({
        revokedAt: deletedAt,
        revokedByUserId: target.id,
        revocationReason: "Conta excluída pelo titular.",
      })
      .where(
        and(
          eq(accessGrants.userId, target.id),
          isNull(accessGrants.revokedAt),
        ),
      ),
    database
      .update(user)
      .set({
        name: "Conta excluída",
        email: anonymizedEmail,
        emailVerified: false,
        image: null,
        role: "user",
        status: "ANONYMIZED",
        banned: true,
        banReason: "Conta excluída pelo titular.",
        banExpires: null,
        authVersion: sql`${user.authVersion} + 1`,
        deletedAt,
      })
      .where(eq(user.id, target.id)),
    database.insert(auditLogs).values({
      actorType: "USER",
      actorUserId: target.id,
      action: "ACCOUNT_ANONYMIZED",
      entityType: "user",
      entityId: target.id,
      reason: "Solicitação de exclusão realizada pelo titular.",
      requestId: crypto.randomUUID(),
    }),
  ]);

  redirect("/conta-excluida");
}
