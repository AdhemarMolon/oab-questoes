import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "./classNames";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  action,
  className,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <div
      {...props}
      className={classNames(styles.emptyState, className)}
    >
      {icon ? <div aria-hidden="true" className={styles.icon}>{icon}</div> : null}
      <h2 className={styles.title}>{title}</h2>
      {description ? <div className={styles.description}>{description}</div> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
