import { createHmac, timingSafeEqual } from "node:crypto";

import {
  getApplicationUrl,
  requireAbacatePayApiKey,
  type BillingPlanConfiguration,
} from "@/lib/billing/config";

const API_BASE_URL = "https://api.abacatepay.com/v2";

// Public verification key published in AbacatePay's webhook documentation.
const ABACATEPAY_WEBHOOK_PUBLIC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

type AbacatePayEnvelope<T> = {
  data?: T;
  error?: string | { message?: string } | null;
  success?: boolean;
};

type CheckoutResponse = {
  id: string;
  externalId: string | null;
  url: string;
  amount: number;
  status: string;
  devMode: boolean;
};

export class AbacatePayApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "AbacatePayApiError";
    this.status = status;
  }
}

function providerErrorMessage(error: AbacatePayEnvelope<unknown>["error"]) {
  if (typeof error === "string") return error;
  if (error && typeof error.message === "string") return error.message;
  return "A AbacatePay não conseguiu processar a solicitação.";
}

async function requestAbacatePay<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireAbacatePayApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  let payload: AbacatePayEnvelope<T>;
  try {
    payload = (await response.json()) as AbacatePayEnvelope<T>;
  } catch {
    throw new AbacatePayApiError(
      "A AbacatePay devolveu uma resposta inválida.",
      response.status,
    );
  }

  if (!response.ok || payload.success === false || !payload.data) {
    throw new AbacatePayApiError(
      providerErrorMessage(payload.error),
      response.status,
    );
  }

  return payload.data;
}

export async function createAbacatePayCheckout(input: {
  orderId: string;
  userId: string;
  plan: BillingPlanConfiguration;
}): Promise<CheckoutResponse> {
  const applicationUrl = getApplicationUrl();
  const path =
    input.plan.kind === "SUBSCRIPTION"
      ? "/subscriptions/create"
      : "/checkouts/create";
  const methods =
    input.plan.kind === "SUBSCRIPTION" ? ["CARD"] : ["PIX"];

  const checkout = await requestAbacatePay<CheckoutResponse>(path, {
    items: [{ id: input.plan.productId, quantity: 1 }],
    methods,
    externalId: input.orderId,
    returnUrl: `${applicationUrl}/planos`,
    completionUrl: `${applicationUrl}/pagamento?pedido=${input.orderId}`,
    metadata: {
      orderId: input.orderId,
      userId: input.userId,
      plan: input.plan.plan,
    },
  });

  if (
    !checkout.id ||
    !checkout.url ||
    !checkout.url.startsWith("https://") ||
    !Number.isSafeInteger(checkout.amount)
  ) {
    throw new AbacatePayApiError(
      "A AbacatePay devolveu um checkout incompleto.",
    );
  }

  if (checkout.amount !== input.plan.amountCents) {
    throw new AbacatePayApiError(
      "O preço do produto na AbacatePay não corresponde ao preço configurado na plataforma.",
    );
  }

  return checkout;
}

export async function cancelAbacatePaySubscription(
  subscriptionId: string,
): Promise<void> {
  await requestAbacatePay<{ id: string; status: string }>(
    "/subscriptions/cancel",
    { id: subscriptionId },
  );
}

export function verifyAbacatePaySignature(
  rawBody: string,
  signature: string,
): boolean {
  const expected = createHmac("sha256", ABACATEPAY_WEBHOOK_PUBLIC_KEY)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}
