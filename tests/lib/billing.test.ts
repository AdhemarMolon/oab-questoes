import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAbacatePayCheckout,
  verifyAbacatePaySignature,
} from "@/lib/billing/abacatepay";
import {
  BillingConfigurationError,
  getBillingPlanConfiguration,
} from "@/lib/billing/config";
import { addBillingPeriod, parseAbacatePayWebhook } from "@/lib/billing/webhook";

const PUBLIC_WEBHOOK_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("billing configuration", () => {
  it("requires both product id and a positive price in cents", () => {
    vi.stubEnv("ABACATEPAY_MONTHLY_PIX_PRODUCT_ID", "prod_monthly_pix");
    vi.stubEnv("ABACATEPAY_MONTHLY_PRICE_CENTS", "2990");

    expect(getBillingPlanConfiguration("MONTHLY")).toMatchObject({
      productId: "prod_monthly_pix",
      amountCents: 2990,
      kind: "ONE_TIME",
    });

    vi.stubEnv("ABACATEPAY_MONTHLY_PRICE_CENTS", "29.90");
    expect(() => getBillingPlanConfiguration("MONTHLY")).toThrow(
      BillingConfigurationError,
    );
  });
});

describe("AbacatePay API", () => {
  it("creates a recurring checkout with a server-owned external id", async () => {
    vi.stubEnv("ABACATEPAY_API_KEY", "test_api_key");
    vi.stubEnv("BETTER_AUTH_URL", "https://www.minhaoab.com.br  ");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          error: null,
          data: {
            id: "bill_123",
            externalId: "order-123",
            url: "https://app.abacatepay.com/pay/bill_123",
            amount: 2990,
            status: "PENDING",
            devMode: true,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createAbacatePayCheckout({
        orderId: "order-123",
        userId: "user-123",
        plan: {
          plan: "MONTHLY",
          name: "Mensal",
          billingLabel: "Cobrança mensal",
          kind: "SUBSCRIPTION",
          productId: "prod_monthly",
          amountCents: 2990,
        },
      }),
    ).resolves.toMatchObject({ id: "bill_123", amount: 2990 });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.abacatepay.com/v2/subscriptions/create",
    );
    expect(request.headers).toMatchObject({
      Authorization: "Bearer test_api_key",
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      externalId: "order-123",
      methods: ["CARD"],
      completionUrl:
        "https://www.minhaoab.com.br/pagamento?pedido=order-123",
    });
  });

  it("creates a one-time checkout using PIX without requiring card support", async () => {
    vi.stubEnv("ABACATEPAY_API_KEY", "test_api_key");
    vi.stubEnv("BETTER_AUTH_URL", "https://www.minhaoab.com.br");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        error: null,
        data: {
          id: "bill_lifetime",
          externalId: "order-lifetime",
          url: "https://app.abacatepay.com/pay/bill_lifetime",
          amount: 14990,
          status: "PENDING",
          devMode: true,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createAbacatePayCheckout({
      orderId: "order-lifetime",
      userId: "user-123",
      plan: {
        plan: "LIFETIME",
        name: "Vitalício",
        billingLabel: "Pagamento único",
        kind: "ONE_TIME",
        productId: "prod_lifetime",
        amountCents: 14990,
      },
    });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.abacatepay.com/v2/checkouts/create");
    expect(JSON.parse(String(request.body))).toMatchObject({
      externalId: "order-lifetime",
      methods: ["PIX"],
    });
  });

  it("rejects a checkout when the provider price differs", async () => {
    vi.stubEnv("ABACATEPAY_API_KEY", "test_api_key");
    vi.stubEnv("BETTER_AUTH_URL", "https://www.minhaoab.com.br");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          success: true,
          data: {
            id: "bill_wrong",
            externalId: "order-123",
            url: "https://app.abacatepay.com/pay/bill_wrong",
            amount: 3990,
            status: "PENDING",
            devMode: true,
          },
        }),
      ),
    );

    await expect(
      createAbacatePayCheckout({
        orderId: "order-123",
        userId: "user-123",
        plan: {
          plan: "MONTHLY",
          name: "Mensal",
          billingLabel: "Cobrança mensal",
          kind: "SUBSCRIPTION",
          productId: "prod_monthly",
          amountCents: 2990,
        },
      }),
    ).rejects.toThrow("não corresponde");
  });
});

describe("AbacatePay webhooks", () => {
  it("grants exactly 30 days for a monthly PIX purchase", () => {
    expect(addBillingPeriod(new Date("2026-01-31T12:00:00.000Z"), "MONTHLY"))
      .toEqual(new Date("2026-03-02T12:00:00.000Z"));
  });

  it("validates the documented HMAC signature", () => {
    const body = JSON.stringify({ id: "log_123", event: "checkout.completed" });
    const signature = createHmac("sha256", PUBLIC_WEBHOOK_KEY)
      .update(Buffer.from(body, "utf8"))
      .digest("base64");

    expect(verifyAbacatePaySignature(body, signature)).toBe(true);
    expect(verifyAbacatePaySignature(`${body} `, signature)).toBe(false);
  });

  it("accepts only the flexible v2 envelope required for processing", () => {
    expect(
      parseAbacatePayWebhook({
        id: "log_123",
        event: "subscription.renewed",
        apiVersion: 2,
        devMode: false,
        data: { futureField: "kept" },
        anotherFutureField: true,
      }),
    ).toMatchObject({
      id: "log_123",
      event: "subscription.renewed",
      apiVersion: 2,
    });

    expect(
      parseAbacatePayWebhook({
        id: "log_legacy",
        event: "billing.paid",
        apiVersion: 1,
        devMode: false,
        data: {},
      }),
    ).toBeNull();
  });
});
