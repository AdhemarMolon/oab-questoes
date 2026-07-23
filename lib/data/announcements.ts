import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";

import { getDb } from "@/db";
import { announcementReceipts, announcements } from "@/db/schema";
import { canViewAnnouncement, type ResolvedAccess } from "@/lib/access";

export async function getVisibleAnnouncement(
  userId: string,
  access: ResolvedAccess,
  now = new Date(),
) {
  const candidates = await getDb()
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      audience: announcements.audience,
      dismissible: announcements.dismissible,
      startsAt: announcements.startsAt,
      endsAt: announcements.endsAt,
      dismissedAt: announcementReceipts.dismissedAt,
    })
    .from(announcements)
    .leftJoin(
      announcementReceipts,
      and(
        eq(announcementReceipts.announcementId, announcements.id),
        eq(announcementReceipts.userId, userId),
      ),
    )
    .where(
      and(
        eq(announcements.status, "PUBLISHED"),
        lte(announcements.startsAt, now),
        or(isNull(announcements.endsAt), gt(announcements.endsAt, now)),
        isNull(announcementReceipts.dismissedAt),
      ),
    )
    .orderBy(desc(announcements.publishedAt), desc(announcements.createdAt))
    .limit(10);

  return (
    candidates.find((announcement) =>
      canViewAnnouncement(access, announcement.audience),
    ) ?? null
  );
}
