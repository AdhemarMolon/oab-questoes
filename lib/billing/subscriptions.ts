import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { accessGrants, billingSubscriptions } from "@/db/schema";
import { cancelAbacatePaySubscription } from "@/lib/billing/abacatepay";

export class SubscriptionCancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionCancellationError";
  }
}

export async function cancelUserSubscription(
  userId: string,
  subscriptionId: string,
): Promise<void> {
  const database = getDb();
  const rows = await database
    .select()
    .from(billingSubscriptions)
    .where(
      and(
        eq(billingSubscriptions.id, subscriptionId),
        eq(billingSubscriptions.userId, userId),
        inArray(billingSubscriptions.status, ["ACTIVE", "PAST_DUE"]),
      ),
    )
    .limit(1);
  const subscription = rows[0];

  if (!subscription?.externalId) {
    throw new SubscriptionCancellationError(
      "Esta assinatura não está ativa ou não pode ser cancelada por aqui.",
    );
  }

  await cancelAbacatePaySubscription(subscription.externalId);

  const now = new Date();
  const grantRows = await database
    .select({
      id: accessGrants.id,
      startsAt: accessGrants.startsAt,
    })
    .from(accessGrants)
    .where(eq(accessGrants.billingSubscriptionId, subscription.id))
    .limit(1);
  const grant = grantRows[0];

  await database
    .update(billingSubscriptions)
    .set({
      status: "CANCELED",
      canceledAt: now,
      endedAt: now,
      cancelAtPeriodEnd: false,
      lastProviderEventAt: now,
    })
    .where(eq(billingSubscriptions.id, subscription.id));

  if (grant) {
    const endsAt =
      now.getTime() > grant.startsAt.getTime()
        ? now
        : new Date(grant.startsAt.getTime() + 1);

    await database
      .update(accessGrants)
      .set({ endsAt })
      .where(eq(accessGrants.id, grant.id));
  }
}
