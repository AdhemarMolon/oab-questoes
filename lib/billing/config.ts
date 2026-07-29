import type { PlanCode } from "@/db/schema";

export const BILLING_PLAN_CODES = ["MONTHLY", "ANNUAL", "LIFETIME"] as const;

export type BillingPlanCode = (typeof BILLING_PLAN_CODES)[number];

export type BillingPlanConfiguration = {
  plan: BillingPlanCode;
  name: string;
  billingLabel: string;
  kind: "SUBSCRIPTION" | "ONE_TIME";
  productId: string;
  amountCents: number;
};

type PlanEnvironment = {
  productId: string;
  price: string;
};

const PLAN_DETAILS: Record<
  BillingPlanCode,
  Pick<BillingPlanConfiguration, "name" | "billingLabel" | "kind">
> = {
  MONTHLY: {
    name: "Mensal",
    billingLabel: "Cobrança mensal",
    kind: "SUBSCRIPTION",
  },
  ANNUAL: {
    name: "Anual",
    billingLabel: "Cobrança anual",
    kind: "SUBSCRIPTION",
  },
  LIFETIME: {
    name: "Vitalício",
    billingLabel: "Pagamento único",
    kind: "ONE_TIME",
  },
};

export class BillingConfigurationError extends Error {
  readonly code = "BILLING_NOT_CONFIGURED";

  constructor(message = "Os pagamentos ainda não estão configurados.") {
    super(message);
    this.name = "BillingConfigurationError";
  }
}

function readPlanEnvironment(plan: BillingPlanCode): PlanEnvironment {
  switch (plan) {
    case "MONTHLY":
      return {
        productId: process.env.ABACATEPAY_MONTHLY_PRODUCT_ID?.trim() ?? "",
        price: process.env.ABACATEPAY_MONTHLY_PRICE_CENTS?.trim() ?? "",
      };
    case "ANNUAL":
      return {
        productId: process.env.ABACATEPAY_ANNUAL_PRODUCT_ID?.trim() ?? "",
        price: process.env.ABACATEPAY_ANNUAL_PRICE_CENTS?.trim() ?? "",
      };
    case "LIFETIME":
      return {
        productId: process.env.ABACATEPAY_LIFETIME_PRODUCT_ID?.trim() ?? "",
        price: process.env.ABACATEPAY_LIFETIME_PRICE_CENTS?.trim() ?? "",
      };
  }
}

function parsePrice(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const amount = Number(value);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function isBillingPlanCode(value: unknown): value is BillingPlanCode {
  return (
    typeof value === "string" &&
    BILLING_PLAN_CODES.includes(value as BillingPlanCode)
  );
}

export function getBillingPlanConfiguration(
  plan: BillingPlanCode,
): BillingPlanConfiguration {
  const environment = readPlanEnvironment(plan);
  const amountCents = parsePrice(environment.price);

  if (!environment.productId || amountCents === null) {
    throw new BillingConfigurationError(
      `O plano ${PLAN_DETAILS[plan].name} ainda não está disponível para compra.`,
    );
  }

  return {
    plan,
    ...PLAN_DETAILS[plan],
    productId: environment.productId,
    amountCents,
  };
}

export function getBillingCatalog() {
  const apiConfigured = Boolean(process.env.ABACATEPAY_API_KEY?.trim());

  return BILLING_PLAN_CODES.map((plan) => {
    try {
      const configuration = getBillingPlanConfiguration(plan);
      return {
        ...configuration,
        configured: apiConfigured,
      };
    } catch {
      return {
        plan,
        ...PLAN_DETAILS[plan],
        productId: "",
        amountCents: null,
        configured: false,
      };
    }
  });
}

export function requireAbacatePayApiKey(): string {
  const apiKey = process.env.ABACATEPAY_API_KEY?.trim();

  if (!apiKey) {
    throw new BillingConfigurationError(
      "A chave da AbacatePay ainda não foi configurada.",
    );
  }

  return apiKey;
}

export function requireAbacatePayWebhookSecret(): string {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new BillingConfigurationError(
      "O segredo do webhook da AbacatePay ainda não foi configurado.",
    );
  }

  return secret;
}

export function getApplicationUrl(): string {
  const value = (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    ""
  ).trim();

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.origin;
  } catch {
    throw new BillingConfigurationError(
      "A URL pública da plataforma não está configurada corretamente.",
    );
  }
}

export function planFromProductId(productId: string): BillingPlanCode | null {
  for (const plan of BILLING_PLAN_CODES) {
    const environment = readPlanEnvironment(plan);
    if (environment.productId && environment.productId === productId) {
      return plan;
    }
  }

  return null;
}

export function isPaidPlan(plan: PlanCode): plan is BillingPlanCode {
  return plan !== "FREE";
}
