import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./AdminSidebar.module.css";

export interface AdminNavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  match?: "exact" | "prefix";
}

export interface AdminIdentity {
  name: string;
  roleLabel?: string;
}

export interface AdminSidebarProps {
  navigation: readonly AdminNavItem[];
  currentPath?: string;
  administrator?: AdminIdentity;
  dashboardHref?: string;
  backHref?: string;
  backLabel?: string;
}

function isCurrentPath(item: AdminNavItem, currentPath?: string) {
  if (!currentPath) return false;
  if (item.match === "exact" || item.href === "/" || item.href === "/admin") {
    return currentPath === item.href;
  }
  return currentPath === item.href || currentPath.startsWith(`${item.href}/`);
}

export function AdminSidebar({
  administrator,
  backHref = "/dashboard",
  backLabel = "Voltar à plataforma",
  currentPath,
  dashboardHref = "/admin",
  navigation,
}: AdminSidebarProps) {
  return (
    <aside aria-label="Menu administrativo" className={styles.sidebar}>
      <Link className={styles.brand} href={dashboardHref}>
        <Image
          alt=""
          aria-hidden="true"
          className={styles.brandLogo}
          height={46}
          src="/brand/minha-oab-mark.png"
          width={46}
        />
        <span>
          <strong>Minha OAB</strong>
          <small>Administração</small>
        </span>
      </Link>

      <nav aria-label="Navegação administrativa" className={styles.navigation}>
        {navigation.map((item) => {
          const active = isCurrentPath(item, currentPath);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={active ? styles.activeLink : styles.navLink}
              href={item.href}
              key={item.href}
            >
              {item.icon ? <span aria-hidden="true" className={styles.icon}>{item.icon}</span> : null}
              <span>{item.label}</span>
              {item.badge !== undefined ? <span className={styles.badge}>{item.badge}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        {administrator ? (
          <div className={styles.identity}>
            <span aria-hidden="true" className={styles.avatar}>
              {administrator.name.trim().charAt(0).toLocaleUpperCase("pt-BR") || "A"}
            </span>
            <span>
              <strong>{administrator.name}</strong>
              <small>{administrator.roleLabel ?? "Administrador"}</small>
            </span>
          </div>
        ) : null}
        <Link className={styles.backLink} href={backHref}>
          <span aria-hidden="true">←</span> {backLabel}
        </Link>
      </div>
    </aside>
  );
}
