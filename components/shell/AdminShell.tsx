import type { ReactNode } from "react";
import {
  AdminSidebar,
  type AdminIdentity,
  type AdminNavItem,
} from "./AdminSidebar";
import styles from "./AdminShell.module.css";

export interface AdminShellProps {
  children: ReactNode;
  navigation: readonly AdminNavItem[];
  currentPath?: string;
  administrator?: AdminIdentity;
  header?: ReactNode;
  announcement?: ReactNode;
  dashboardHref?: string;
  backHref?: string;
  backLabel?: string;
  mainContentId?: string;
}

export function AdminShell({
  administrator,
  announcement,
  backHref,
  backLabel,
  children,
  currentPath,
  dashboardHref,
  header,
  mainContentId = "admin-main-content",
  navigation,
}: AdminShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href={`#${mainContentId}`}>
        Pular para o conteúdo administrativo
      </a>
      <AdminSidebar
        administrator={administrator}
        backHref={backHref}
        backLabel={backLabel}
        currentPath={currentPath}
        dashboardHref={dashboardHref}
        navigation={navigation}
      />
      <div className={styles.workspace}>
        {header ? <div className={styles.header}>{header}</div> : null}
        {announcement ? <div className={styles.announcement}>{announcement}</div> : null}
        <main className={styles.content} id={mainContentId} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
