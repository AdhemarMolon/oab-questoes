import type {
  AccessGrant,
  AccessGrantSource,
  PlanCode,
  UserRole,
} from "../db/schema";

export type AccessGrantLike = Pick<
  AccessGrant,
  "id" | "plan" | "source" | "startsAt" | "endsAt" | "revokedAt"
>;

export type StatisticsLevel = "BASIC" | "ADVANCED";
export type SimulationAccessLevel = "FREE" | "FULL_ACCESS";
export type AnnouncementAudience = "ALL" | "FREE" | "FULL_ACCESS";

export type ResolvedAccess = {
  effectivePlan: PlanCode;
  hasFullAccess: boolean;
  statisticsLevel: StatisticsLevel;
  isPaying: boolean;
  fullAccessEndsAt: Date | null;
  activeGrantIds: string[];
};

const PLAN_PRIORITY: Record<PlanCode, number> = {
  FREE: 0,
  MONTHLY: 1,
  ANNUAL: 2,
  LIFETIME: 3,
};

const PAYING_SOURCES = new Set<AccessGrantSource>([
  "SUBSCRIPTION",
  "PURCHASE",
]);

export function isGrantActive(
  grant: AccessGrantLike,
  now: Date = new Date(),
): boolean {
  if (grant.revokedAt) return false;
  if (grant.startsAt.getTime() > now.getTime()) return false;
  if (grant.endsAt && grant.endsAt.getTime() <= now.getTime()) return false;
  return true;
}

export function isPayingGrant(grant: AccessGrantLike): boolean {
  return grant.plan !== "FREE" && PAYING_SOURCES.has(grant.source);
}

export function resolveAccess(
  grants: readonly AccessGrantLike[],
  now: Date = new Date(),
): ResolvedAccess {
  const activeGrants = grants.filter((grant) => isGrantActive(grant, now));
  const fullAccessGrants = activeGrants.filter((grant) => grant.plan !== "FREE");

  const effectivePlan = activeGrants.reduce<PlanCode>((current, grant) => {
    return PLAN_PRIORITY[grant.plan] > PLAN_PRIORITY[current]
      ? grant.plan
      : current;
  }, "FREE");

  let fullAccessEndsAt: Date | null = null;
  if (fullAccessGrants.length > 0 && fullAccessGrants.every((grant) => grant.endsAt)) {
    fullAccessEndsAt = new Date(
      Math.max(...fullAccessGrants.map((grant) => grant.endsAt!.getTime())),
    );
  }

  const hasFullAccess = fullAccessGrants.length > 0;

  return {
    effectivePlan,
    hasFullAccess,
    statisticsLevel: hasFullAccess ? "ADVANCED" : "BASIC",
    isPaying: activeGrants.some(isPayingGrant),
    fullAccessEndsAt,
    activeGrantIds: activeGrants.map((grant) => grant.id),
  };
}

export function hasAdminRole(role: UserRole): boolean {
  return role === "admin";
}

export function canAccessSimulation(
  access: ResolvedAccess,
  requiredAccess: SimulationAccessLevel,
): boolean {
  return requiredAccess === "FREE" || access.hasFullAccess;
}

export function canViewAnnouncement(
  access: ResolvedAccess,
  audience: AnnouncementAudience,
): boolean {
  if (audience === "ALL") return true;
  if (audience === "FREE") return !access.hasFullAccess;
  return access.hasFullAccess;
}
