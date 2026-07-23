import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { accessGrants } from "@/db/schema";
import { resolveAccess, type ResolvedAccess } from "@/lib/access";

export async function getUserAccess(userId: string, now = new Date()): Promise<ResolvedAccess> {
  const grants = await getDb()
    .select({
      id: accessGrants.id,
      plan: accessGrants.plan,
      source: accessGrants.source,
      startsAt: accessGrants.startsAt,
      endsAt: accessGrants.endsAt,
      revokedAt: accessGrants.revokedAt,
    })
    .from(accessGrants)
    .where(eq(accessGrants.userId, userId))
    .orderBy(desc(accessGrants.startsAt));

  return resolveAccess(grants, now);
}
