import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { verifyAbacatePaySignature } from "@/lib/billing/abacatepay";
import {
  BillingConfigurationError,
  requireAbacatePayWebhookSecret,
} from "@/lib/billing/config";
import {
  parseAbacatePayWebhook,
  processAbacatePayWebhook,
} from "@/lib/billing/webhook";

export const runtime = "nodejs";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = requireAbacatePayWebhookSecret();
  } catch (error) {
    if (error instanceof BillingConfigurationError) {
      console.error("AbacatePay webhook is not configured", error);
      return NextResponse.json(
        { ok: false, error: "Webhook is not configured." },
        { status: 503 },
      );
    }
    throw error;
  }

  const receivedSecret = new URL(request.url).searchParams.get(
    "webhookSecret",
  );
  if (!receivedSecret || !safeEqual(receivedSecret, secret)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const signature = request.headers.get("x-webhook-signature");
  const rawBody = await request.text();

  if (!signature || !verifyAbacatePaySignature(rawBody, signature)) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON." },
      { status: 400 },
    );
  }

  const payload = parseAbacatePayWebhook(body);
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "Invalid webhook envelope." },
      { status: 400 },
    );
  }

  try {
    const result = await processAbacatePayWebhook(payload, rawBody);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Failed to process AbacatePay webhook", error);
    return NextResponse.json(
      { ok: false, error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
