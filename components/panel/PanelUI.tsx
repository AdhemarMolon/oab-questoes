import type { CSSProperties, ReactNode } from "react";

import styles from "@/app/(platform)/painel/study.module.css";

export function PanelPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className={styles.pageHeader}><div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>{action}</header>;
}

export function StatCard({ label, value, detail, tone = "default" }: { label: string; value: ReactNode; detail?: ReactNode; tone?: "default" | "brand" | "gold" }) {
  return <article className={`${styles.statCard} ${styles[tone]}`}><span>{label}</span><strong>{value}</strong>{detail ? <p>{detail}</p> : null}</article>;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className={styles.progressWrap}>{label ? <span>{label}</span> : null}<i role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe}><b style={{ width: `${safe}%` }}/></i></div>;
}

export function EmptyPanel({ title, children }: { title: string; children: ReactNode }) {
  return <div className={styles.empty}><strong>{title}</strong><p>{children}</p></div>;
}

export function MiniBars({ items }: { items: Array<{ label: string; value: number; detail?: string }> }) {
  return <div className={styles.miniBars}>{items.map((item) => <div key={item.label}><div><span>{item.label}</span><strong>{item.detail ?? `${item.value}%`}</strong></div><i><b style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }}/></i></div>)}</div>;
}

export function TrendChart({ items }: { items: Array<{ label: string; value: number }> }) {
  return <div className={styles.trendChart} role="img" aria-label="Evolução do aproveitamento"><div className={styles.chartGrid}/>{items.map((item) => <div className={styles.chartColumn} key={item.label}><div><i style={{ height: `${Math.max(3, item.value)}%` } as CSSProperties}/></div><span>{item.label}</span></div>)}</div>;
}
