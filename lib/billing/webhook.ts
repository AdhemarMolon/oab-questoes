import { createHash } from "node:crypto";

import {
  and,
  eq,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  accessGrants,
  billingOrders,
  billingSubscriptions,
  webhookEvents,
  type BillingOrder,
  type BillingSubscription,
  type JsonObject,
  type PlanCode,
} from "@/db/schema";

type UnknownRecord = Record<string, unknown>;

export type AbacatePayWebhookPayload = {
  id: string;
  event: string;
  apiVersion: number;
  devMode: boolean;
  data: UnknownRecord;
  raw: JsonObject;
};

export type WebhookProcessingResult = {
  duplicate: boolean;
  ignored: boolean;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asDate(value: unknown, fallback = new Date()): Date {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function nestedRecord(record: UnknownRecord, key: string): UnknownRecord | null {
  return asRecord(record[key]);
}

function addBillingPeriod(date: Date, plan: PlanCode): Date {
  const result = new Date(date);

  if (plan === "ANNUAL") {
    result.setUTCFullYear(result.getUTCFullYear() + 1);
  } else if (plan === "MONTHLY") {
    result.setUTCMonth(result.getUTCMonth() + 1);
  } else {
    throw new Error(`Plan ${plan} does not have a recurring billing period.`);
  }

  return result;
}

function getCheckout(payload: AbacatePayWebhookPayload): UnknownRecord | null {
  return (
    nestedRecord(payload.data, "checkout") ??
    (payload.event.startsWith("checkout.") ? payload.data : null)
  );
}

function checkoutProductId(checkout: UnknownRecord): string | null {
  const items = checkout.items;
  if (!Array.isArray(items)) return null;
  const firstItem = asRecord(items[0]);
  return firstItem ? asString(firstItem.id) : null;
}

function metadataProductId(order: BillingOrder): string | null {
  return asString(asRecord(order.metadata)?.productId);
}

async function findOrder(
  checkout: UnknownRecord,
): Promise<BillingOrder | null> {
  const database = getDb();
  const localId = asString(checkout.externalId);
  const providerId = asString(checkout.id);

  if (!localId && !providerId) return null;

  const conditions = [];
  if (localId) conditions.push(eq(billingOrders.id, localId));
  if (providerId) conditions.push(eq(billingOrders.externalId, providerId));

  const rows = await database
    .select()
    .from(billingOrders)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions))
    .limit(1);

  return rows[0] ?? null;
}

function assertCheckoutMatchesOrder(
  payload: AbacatePayWebhookPayload,
  checkout: UnknownRecord,
  order: BillingOrder,
) {
  const amount = asNumber(checkout.amount);
  if (amount === null || amount !== order.amountCents) {
    throw new Error(`Checkout amount mismatch for order ${order.id}.`);
  }

  const expectedProductId = metadataProductId(order);
  const actualProductId = checkoutProductId(checkout);
  if (
    expectedProductId &&
    actualProductId &&
    expectedProductId !== actualProductId
  ) {
    throw new Error(`Checkout product mismatch for order ${order.id}.`);
  }

  const orderDevMode = asRecord(order.metadata)?.devMode;
  if (
    typeof orderDevMode === "boolean" &&
    orderDevMode !== payload.devMode
  ) {
    throw new Error(`Checkout environment mismatch for order ${order.id}.`);
  }
}

async function updateGrantEnd(
  subscription: BillingSubscription,
  desiredEnd: Date,
) {
  const database = getDb();
  const grantRows = await database
    .select({
      id: accessGrants.id,
      startsAt: accessGrants.startsAt,
      endsAt: accessGrants.endsAt,
    })
    .from(accessGrants)
    .where(eq(accessGrants.billingSubscriptionId, subscription.id))
    .limit(1);
  const grant = grantRows[0];

  if (!grant) return;

  const minimumEnd = new Date(grant.startsAt.getTime() + 1);
  const safeEnd =
    desiredEnd.getTime() > minimumEnd.getTime() ? desiredEnd : minimumEnd;
  const nextEnd =
    grant.endsAt && grant.endsAt.getTime() > safeEnd.getTime()
      ? grant.endsAt
      : safeEnd;

  await database
    .update(accessGrants)
    .set({ endsAt: nextEnd })
    .where(eq(accessGrants.id, grant.id));
}

async function endSubscriptionGrantAt(
  subscription: BillingSubscription,
  desiredEnd: Date,
) {
  const database = getDb();
  const grantRows = await database
    .select({
      id: accessGrants.id,
      startsAt: accessGrants.startsAt,
    })
    .from(accessGrants)
    .where(eq(accessGrants.billingSubscriptionId, subscription.id))
    .limit(1);
  const grant = grantRows[0];

  if (!grant) return;

  const safeEnd =
    desiredEnd.getTime() > grant.startsAt.getTime()
      ? desiredEnd
      : new Date(grant.startsAt.getTime() + 1);

  await database
    .update(accessGrants)
    .set({ endsAt: safeEnd })
    .where(eq(accessGrants.id, grant.id));
}

async function upsertSubscription(
  order: BillingOrder,
  subscriptionData: UnknownRecord,
  eventAt: Date,
): Promise<BillingSubscription> {
  const externalId = asString(subscriptionData.id);
  if (!externalId) throw new Error("Subscription event is missing its id.");
  if (order.plan !== "MONTHLY" && order.plan !== "ANNUAL") {
    throw new Error(`Order ${order.id} is not a recurring plan.`);
  }

  const database = getDb();
  const periodEnd = addBillingPeriod(eventAt, order.plan);
  const rows = await database
    .insert(billingSubscriptions)
    .values({
      userId: order.userId,
      plan: order.plan,
      externalId,
      status: "ACTIVE",
      currentPeriodStart: eventAt,
      currentPeriodEnd: periodEnd,
      lastProviderEventAt: eventAt,
      metadata: {
        initialOrderId: order.id,
        method: asString(subscriptionData.method),
      },
    })
    .onConflictDoUpdate({
      target: [
        billingSubscriptions.provider,
        billingSubscriptions.externalId,
      ],
      set: {
        status: "ACTIVE",
        currentPeriodStart: eventAt,
        currentPeriodEnd: periodEnd,
        lastProviderEventAt: eventAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  const subscription = rows[0];
  if (!subscription) {
    throw new Error(`Unable to persist subscription ${externalId}.`);
  }

  return subscription;
}

async function processLifetimeCompleted(
  payload: AbacatePayWebhookPayload,
): Promise<void> {
  const checkout = getCheckout(payload);
  if (!checkout) throw new Error("Checkout event is missing checkout data.");
  const order = await findOrder(checkout);
  if (!order) throw new Error("Checkout does not match a local order.");
  if (order.kind !== "ONE_TIME" || order.plan !== "LIFETIME") {
    throw new Error(`Order ${order.id} is not a lifetime purchase.`);
  }

  assertCheckoutMatchesOrder(payload, checkout, order);

  const database = getDb();
  const paidAt = asDate(checkout.updatedAt);
  await database
    .update(billingOrders)
    .set({
      status: "PAID",
      paidAt,
      externalId: asString(checkout.id) ?? order.externalId,
      checkoutUrl: asString(checkout.url) ?? order.checkoutUrl,
    })
    .where(eq(billingOrders.id, order.id));

  await database
    .insert(accessGrants)
    .values({
      userId: order.userId,
      plan: "LIFETIME",
      source: "PURCHASE",
      billingOrderId: order.id,
      startsAt: paidAt,
      note: "Pagamento confirmado pela AbacatePay.",
      idempotencyKey: `abacatepay:purchase:${order.id}`,
    })
    .onConflictDoNothing({
      target: accessGrants.idempotencyKey,
    });
}

async function processLifetimeReversal(
  payload: AbacatePayWebhookPayload,
): Promise<void> {
  const checkout = getCheckout(payload);
  if (!checkout) throw new Error("Checkout event is missing checkout data.");
  const order = await findOrder(checkout);
  if (!order) throw new Error("Checkout does not match a local order.");
  if (order.kind !== "ONE_TIME") return;

  const database = getDb();
  const now = asDate(checkout.updatedAt);
  const refunded = payload.event === "checkout.refunded";
  const reason = refunded
    ? "Pagamento reembolsado pela AbacatePay."
    : "Pagamento contestado ou perdido na AbacatePay.";

  await database
    .update(billingOrders)
    .set({
      status: refunded ? "REFUNDED" : "FAILED",
      refundedAt: refunded ? now : order.refundedAt,
    })
    .where(eq(billingOrders.id, order.id));

  await database
    .update(accessGrants)
    .set({
      revokedAt: now,
      revokedByUserId: null,
      revocationReason: reason,
    })
    .where(
      and(
        eq(accessGrants.billingOrderId, order.id),
        isNull(accessGrants.revokedAt),
      ),
    );
}

async function processSubscriptionCompleted(
  payload: AbacatePayWebhookPayload,
): Promise<void> {
  const checkout = getCheckout(payload);
  const subscriptionData = nestedRecord(payload.data, "subscription");
  if (!checkout || !subscriptionData) {
    throw new Error("Subscription event is missing required data.");
  }

  const order = await findOrder(checkout);
  if (!order) throw new Error("Subscription does not match a local order.");
  if (order.kind !== "SUBSCRIPTION") {
    throw new Error(`Order ${order.id} is not a subscription.`);
  }

  assertCheckoutMatchesOrder(payload, checkout, order);

  const eventAt = asDate(
    subscriptionData.updatedAt,
    asDate(subscriptionData.createdAt),
  );
  const subscription = await upsertSubscription(
    order,
    subscriptionData,
    eventAt,
  );
  const periodEnd = addBillingPeriod(eventAt, subscription.plan);
  const database = getDb();

  await database
    .update(billingOrders)
    .set({
      status: "PAID",
      paidAt: eventAt,
      externalId: asString(checkout.id) ?? order.externalId,
      checkoutUrl: asString(checkout.url) ?? order.checkoutUrl,
    })
    .where(eq(billingOrders.id, order.id));

  await database
    .insert(accessGrants)
    .values({
      userId: order.userId,
      plan: subscription.plan,
      source: "SUBSCRIPTION",
      billingSubscriptionId: subscription.id,
      startsAt: eventAt,
      endsAt: periodEnd,
      note: "Assinatura ativada pela AbacatePay.",
      idempotencyKey: `abacatepay:subscription:${subscription.externalId}`,
    })
    .onConflictDoNothing({
      target: accessGrants.idempotencyKey,
    });

  await updateGrantEnd(subscription, periodEnd);
}

async function getSubscriptionFromPayload(
  payload: AbacatePayWebhookPayload,
): Promise<{
  subscription: BillingSubscription;
  providerData: UnknownRecord;
  eventAt: Date;
}> {
  const providerData = nestedRecord(payload.data, "subscription");
  const externalId = providerData ? asString(providerData.id) : null;
  if (!providerData || !externalId) {
    throw new Error("Subscription event is missing its subscription id.");
  }

  const rows = await getDb()
    .select()
    .from(billingSubscriptions)
    .where(
      and(
        eq(billingSubscriptions.provider, "abacatepay"),
        eq(billingSubscriptions.externalId, externalId),
      ),
    )
    .limit(1);
  const subscription = rows[0];
  if (!subscription) {
    throw new Error(`Unknown AbacatePay subscription ${externalId}.`);
  }

  return {
    subscription,
    providerData,
    eventAt: asDate(providerData.updatedAt),
  };
}

async function processSubscriptionRenewed(
  payload: AbacatePayWebhookPayload,
): Promise<void> {
  const { subscription, eventAt } =
    await getSubscriptionFromPayload(payload);
  const periodEnd = addBillingPeriod(eventAt, subscription.plan);
  const database = getDb();

  const updatedRows = await database
    .update(billingSubscriptions)
    .set({
      status: "ACTIVE",
      currentPeriodStart: eventAt,
      currentPeriodEnd: periodEnd,
      lastProviderEventAt: eventAt,
    })
    .where(
      and(
        eq(billingSubscriptions.id, subscription.id),
        or(
          isNull(billingSubscriptions.lastProviderEventAt),
          lt(billingSubscriptions.lastProviderEventAt, eventAt),
        ),
        ne(billingSubscriptions.status, "CANCELED"),
      ),
    )
    .returning({ id: billingSubscriptions.id });

  if (updatedRows.length > 0) {
    await updateGrantEnd(subscription, periodEnd);
  }
}

async function processSubscriptionPaymentFailed(
  payload: AbacatePayWebhookPayload,
): Promise<void> {
  const { subscription, eventAt } =
    await getSubscriptionFromPayload(payload);

  await getDb()
    .update(billingSubscriptions)
    .set({
      status: "PAST_DUE",
      lastProviderEventAt: eventAt,
    })
    .where(
      and(
        eq(billingSubscriptions.id, subscription.id),
        or(
          isNull(billingSubscriptions.lastProviderEventAt),
          lt(billingSubscriptions.lastProviderEventAt, eventAt),
        ),
        ne(billingSubscriptions.status, "CANCELED"),
      ),
    );
}

async function processSubscriptionCancelled(
  payload: AbacatePayWebhookPayload,
): Promise<void> {
  const { subscription, providerData, eventAt } =
    await getSubscriptionFromPayload(payload);
  const canceledAt = asDate(providerData.canceledAt, eventAt);
  const database = getDb();

  await database
    .update(billingSubscriptions)
    .set({
      status: "CANCELED",
      canceledAt,
      endedAt: canceledAt,
      cancelAtPeriodEnd: false,
      lastProviderEventAt: eventAt,
    })
    .where(eq(billingSubscriptions.id, subscription.id));

  await endSubscriptionGrantAt(subscription, canceledAt);
}

async function processProviderEvent(
  payload: AbacatePayWebhookPayload,
): Promise<boolean> {
  switch (payload.event) {
    case "checkout.completed":
      await processLifetimeCompleted(payload);
      return false;
    case "checkout.refunded":
    case "checkout.disputed":
    case "checkout.lost":
      await processLifetimeReversal(payload);
      return false;
    case "subscription.completed":
      await processSubscriptionCompleted(payload);
      return false;
    case "subscription.renewed":
      await processSubscriptionRenewed(payload);
      return false;
    case "subscription.payment_failed":
      await processSubscriptionPaymentFailed(payload);
      return false;
    case "subscription.cancelled":
      await processSubscriptionCancelled(payload);
      return false;
    default:
      return true;
  }
}

export function parseAbacatePayWebhook(
  value: unknown,
): AbacatePayWebhookPayload | null {
  const raw = asRecord(value);
  if (!raw) return null;

  const id = asString(raw.id);
  const event = asString(raw.event);
  const data = asRecord(raw.data);

  if (
    !id ||
    !event ||
    raw.apiVersion !== 2 ||
    typeof raw.devMode !== "boolean" ||
    !data
  ) {
    return null;
  }

  return {
    id,
    event,
    apiVersion: 2,
    devMode: raw.devMode,
    data,
    raw,
  };
}

export async function processAbacatePayWebhook(
  payload: AbacatePayWebhookPayload,
  rawBody: string,
): Promise<WebhookProcessingResult> {
  const database = getDb();
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");

  await database
    .insert(webhookEvents)
    .values({
      externalEventId: payload.id,
      payloadHash,
      eventType: payload.event,
      payload: payload.raw,
      status: "RECEIVED",
    })
    .onConflictDoNothing();

  const rows = await database
    .select({
      id: webhookEvents.id,
      status: webhookEvents.status,
    })
    .from(webhookEvents)
    .where(
      or(
        eq(webhookEvents.externalEventId, payload.id),
        eq(webhookEvents.payloadHash, payloadHash),
      ),
    )
    .limit(1);
  const storedEvent = rows[0];

  if (!storedEvent) {
    throw new Error(`Unable to persist webhook event ${payload.id}.`);
  }

  if (
    storedEvent.status === "PROCESSED" ||
    storedEvent.status === "IGNORED"
  ) {
    return {
      duplicate: true,
      ignored: storedEvent.status === "IGNORED",
    };
  }

  await database
    .update(webhookEvents)
    .set({
      status: "PROCESSING",
      attemptCount: sql`${webhookEvents.attemptCount} + 1`,
      lastError: null,
    })
    .where(eq(webhookEvents.id, storedEvent.id));

  try {
    const ignored = await processProviderEvent(payload);

    await database
      .update(webhookEvents)
      .set({
        status: ignored ? "IGNORED" : "PROCESSED",
        processedAt: new Date(),
        lastError: null,
      })
      .where(eq(webhookEvents.id, storedEvent.id));

    return { duplicate: false, ignored };
  } catch (error) {
    await database
      .update(webhookEvents)
      .set({
        status: "FAILED",
        lastError:
          error instanceof Error ? error.message.slice(0, 2_000) : "unknown",
      })
      .where(eq(webhookEvents.id, storedEvent.id));
    throw error;
  }
}
