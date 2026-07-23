import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "./classNames";
import styles from "./Badge.module.css";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "premium"
  | "admin";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  withDot?: boolean;
}

export function Badge({
  children,
  className,
  variant = "neutral",
  withDot = false,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={classNames(styles.badge, styles[variant], className)}
    >
      {withDot ? <span aria-hidden="true" className={styles.dot} /> : null}
      {children}
    </span>
  );
}
