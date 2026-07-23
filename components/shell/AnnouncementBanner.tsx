import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./AnnouncementBanner.module.css";

export type AnnouncementTone = "info" | "success" | "warning" | "critical";

export interface AnnouncementAction {
  href: string;
  label: string;
}

export interface AnnouncementBannerProps {
  children: ReactNode;
  title?: string;
  tone?: AnnouncementTone;
  action?: AnnouncementAction;
  className?: string;
}

const toneSymbols: Record<AnnouncementTone, string> = {
  info: "i",
  success: "✓",
  warning: "!",
  critical: "!",
};

export function AnnouncementBanner({
  action,
  children,
  className,
  title = "Comunicado",
  tone = "info",
}: AnnouncementBannerProps) {
  return (
    <aside
      aria-label={title}
      className={[styles.banner, styles[tone], className].filter(Boolean).join(" ")}
      role={tone === "critical" ? "alert" : "region"}
    >
      <span aria-hidden="true" className={styles.symbol}>{toneSymbols[tone]}</span>
      <div className={styles.copy}>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
      {action ? (
        <Link className={styles.action} href={action.href}>
          {action.label} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </aside>
  );
}
