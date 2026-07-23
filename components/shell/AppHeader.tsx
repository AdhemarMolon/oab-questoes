import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./AppHeader.module.css";

export interface AppHeaderNavItem {
  href: string;
  label: string;
  match?: "exact" | "prefix";
}

export interface AppHeaderUser {
  name: string;
  email?: string;
}

export interface AppHeaderProps {
  navigation?: readonly AppHeaderNavItem[];
  currentPath?: string;
  user?: AppHeaderUser;
  actions?: ReactNode;
  brandHref?: string;
  brandLabel?: string;
  accountHref?: string;
  mainContentId?: string;
}

function isCurrentPath(item: AppHeaderNavItem, currentPath?: string) {
  if (!currentPath) return false;
  if (item.match === "exact" || item.href === "/") {
    return currentPath === item.href;
  }
  return currentPath === item.href || currentPath.startsWith(`${item.href}/`);
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR"))
    .join("");

  return initials || "U";
}

export function AppHeader({
  accountHref = "/conta",
  actions,
  brandHref = "/",
  brandLabel = "OAB",
  currentPath,
  mainContentId = "main-content",
  navigation = [],
  user,
}: AppHeaderProps) {
  return (
    <>
      <a className={styles.skipLink} href={`#${mainContentId}`}>
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <Link aria-label="Ir para o início" className={styles.brand} href={brandHref}>
          <span className={styles.brandMark}>Minha</span>
          <span>{brandLabel}</span>
        </Link>

        {navigation.length ? (
          <nav aria-label="Navegação principal" className={styles.navigation}>
            {navigation.map((item) => {
              const active = isCurrentPath(item, currentPath);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={active ? styles.activeLink : styles.navLink}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className={styles.actions}>
          {actions}
          {user ? (
            <Link
              aria-label={`Abrir conta de ${user.name}`}
              className={styles.account}
              href={accountHref}
            >
              <span aria-hidden="true" className={styles.avatar}>{getInitials(user.name)}</span>
              <span className={styles.userCopy}>
                <strong>{user.name}</strong>
                {user.email ? <small>{user.email}</small> : null}
              </span>
            </Link>
          ) : null}
        </div>
      </header>
    </>
  );
}
