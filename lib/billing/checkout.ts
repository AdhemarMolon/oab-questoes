import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { billingOrders } from "@/db/schema";
import { createAbacatePayCheckout } from "@/lib/billing/abacatepay";
import {
  getBillingPlanConfiguration,
  type BillingPlanCode,
} from "@/lib/billing/config";

export async function createCheckoutForUser(
  userId: string,
  planCode: BillingPlanCode,
): Promise<string> {
  const database = getDb();
  const plan = getBillingPlanConfiguration(planCode);
  const orderId = crypto.randomUUID();

  await database.insert(billingOrders).values({
    id: orderId,
    userId,
    plan: plan.plan,
    kind: plan.kind,
    amountCents: plan.amountCents,
    idempotencyKey: `abacatepay:checkout:${orderId}`,
    metadata: {
      productId: plan.productId,
    },
  });

  try {
    const checkout = await createAbacatePayCheckout({
      orderId,
      userId,
      plan,
    });

    await database
      .update(billingOrders)
      .set({
        externalId: checkout.id,
        checkoutUrl: checkout.url,
        amountCents: checkout.amount,
        metadata: {
          productId: plan.productId,
          devMode: checkout.devMode,
          providerStatus: checkout.status,
        },
      })
      .where(eq(billingOrders.id, orderId));

    return checkout.url;
  } catch (error) {
    await database
      .update(billingOrders)
      .set({
        status: "FAILED",
        metadata: {
          productId: plan.productId,
          checkoutError:
            error instanceof Error ? error.message.slice(0, 500) : "unknown",
        },
      })
      .where(eq(billingOrders.id, orderId));

    throw error;
  }
}
