import { describe, expect, it } from "vitest";

import {
  canAccessSimulation,
  hasAdminRole,
  resolveAccess,
  type AccessGrantLike,
} from "../../lib/access";

const now = new Date("2026-07-22T12:00:00.000Z");

function grant(
  overrides: Partial<AccessGrantLike> = {},
): AccessGrantLike {
  return {
    id: "grant-1",
    plan: "FREE",
    source: "FREE",
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    endsAt: null,
    revokedAt: null,
    ...overrides,
  };
}

describe("resolveAccess", () => {
  it("falls back to free access with basic statistics", () => {
    expect(resolveAccess([], now)).toEqual({
      effectivePlan: "FREE",
      hasFullAccess: false,
      statisticsLevel: "BASIC",
      isPaying: false,
      fullAccessEndsAt: null,
      activeGrantIds: [],
    });
  });

  it("gives full access for a gift without classifying the user as paying", () => {
    const access = resolveAccess(
      [
        grant({
          id: "gift-1",
          plan: "ANNUAL",
          source: "GIFT",
          endsAt: new Date("2027-07-22T12:00:00.000Z"),
        }),
      ],
      now,
    );

    expect(access.hasFullAccess).toBe(true);
    expect(access.statisticsLevel).toBe("ADVANCED");
    expect(access.isPaying).toBe(false);
    expect(access.effectivePlan).toBe("ANNUAL");
  });

  it("classifies active subscriptions and lifetime purchases as paying", () => {
    const access = resolveAccess(
      [
        grant({
          id: "subscription-1",
          plan: "MONTHLY",
          source: "SUBSCRIPTION",
          endsAt: new Date("2026-08-22T12:00:00.000Z"),
        }),
        grant({
          id: "purchase-1",
          plan: "LIFETIME",
          source: "PURCHASE",
        }),
      ],
      now,
    );

    expect(access.isPaying).toBe(true);
    expect(access.effectivePlan).toBe("LIFETIME");
    expect(access.fullAccessEndsAt).toBeNull();
  });

  it("ignores grants that are expired, future, or revoked", () => {
    const access = resolveAccess(
      [
        grant({
          id: "expired",
          plan: "MONTHLY",
          source: "SUBSCRIPTION",
          endsAt: new Date("2026-07-22T12:00:00.000Z"),
        }),
        grant({
          id: "future",
          plan: "ANNUAL",
          source: "GIFT",
          startsAt: new Date("2026-07-23T12:00:00.000Z"),
          endsAt: new Date("2027-07-23T12:00:00.000Z"),
        }),
        grant({
          id: "revoked",
          plan: "LIFETIME",
          source: "ADMIN",
          revokedAt: new Date("2026-07-21T12:00:00.000Z"),
        }),
      ],
      now,
    );

    expect(access.hasFullAccess).toBe(false);
    expect(access.isPaying).toBe(false);
  });
});

describe("role and simulation policy", () => {
  it("keeps administrative role separate from product access", () => {
    const freeAccess = resolveAccess([], now);

    expect(hasAdminRole("admin")).toBe(true);
    expect(canAccessSimulation(freeAccess, "FREE")).toBe(true);
    expect(canAccessSimulation(freeAccess, "FULL_ACCESS")).toBe(false);
  });
});
