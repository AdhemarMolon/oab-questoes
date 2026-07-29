import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { billingOrders, billingSubscriptions } from "@/db/schema";

export async function getUserBillingSummary(userId: string) {
  const database = getDb();

  const [subscriptions, orders] = await Promise.all([
    database
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.userId, userId))
      .orderBy(desc(billingSubscriptions.createdAt))
      .limit(10),
    database
      .select()
      .from(billingOrders)
      .where(eq(billingOrders.userId, userId))
      .orderBy(desc(billingOrders.createdAt))
      .limit(10),
  ]);

  return { subscriptions, orders };
}

export async function getUserBillingOrder(userId: string, orderId: string) {
  const rows = await getDb()
    .select()
    .from(billingOrders)
    .where(
      and(eq(billingOrders.id, orderId), eq(billingOrders.userId, userId)),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function getCancelableSubscriptions(userId: string) {
  return getDb()
    .select()
    .from(billingSubscriptions)
    .where(
      and(
        eq(billingSubscriptions.userId, userId),
        inArray(billingSubscriptions.status, ["ACTIVE", "PAST_DUE"]),
      ),
    );
}
