import "dotenv/config";

import { eq, sql } from "drizzle-orm";

import { getDb } from "../db";
import { auditLogs, session, user } from "../db/schema";

async function promote() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error("Uso: npm run admin:promote -- usuario@exemplo.com");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada.");
  }

  const database = getDb();
  const users = await database
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);
  const target = users[0];
  if (!target) throw new Error("Usuário não encontrado. Faça o primeiro login com o Google antes de promover.");
  if (target.role === "admin") {
    console.info(`${target.email} já é administrador.`);
    return;
  }

  await database.batch([
    database
      .update(user)
      .set({ role: "admin", authVersion: sql`${user.authVersion} + 1` })
      .where(eq(user.id, target.id)),
    database.delete(session).where(eq(session.userId, target.id)),
    database.insert(auditLogs).values({
      actorType: "SYSTEM",
      action: "FIRST_ADMIN_PROMOTED",
      entityType: "user",
      entityId: target.id,
      beforeData: { role: target.role },
      afterData: { role: "admin" },
      reason: "Promoção explícita pela ferramenta de linha de comando.",
      requestId: crypto.randomUUID(),
    }),
  ]);

  console.info(`${target.email} foi promovido a administrador. Faça login novamente.`);
}

promote().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
