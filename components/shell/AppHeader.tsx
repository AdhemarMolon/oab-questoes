"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

function getNavigationIcon(label: string) {
  const normalizedLabel = label.toLocaleLowerCase("pt-BR");

  if (normalizedLabel.includes("início")) return "⌂";
  if (normalizedLabel.includes("como")) return "?";
  if (normalizedLabel.includes("estat")) return "▥";
  if (normalizedLabel.includes("plano")) return "◇";
  if (normalizedLabel.includes("painel")) return "▦";
  if (normalizedLabel.includes("simulado")) return "✓";
  if (normalizedLabel.includes("quest")) return "§";

  return "→";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    function handleResize() {
      if (window.innerWidth > 720) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileMenuOpen]);

  function closeMobileMenu({ restoreFocus = false } = {}) {
    setMobileMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }

  const brand = (
    <>
      <Image
        alt=""
        aria-hidden="true"
        className={styles.brandLogo}
        height={46}
        preload
        src="/brand/minha-oab-mark.png"
        width={46}
      />
      <span className={styles.brandCopy}>
        <strong>Minha</strong>
        <span>{brandLabel}</span>
      </span>
    </>
  );

  return (
    <>
      <a className={styles.skipLink} href={`#${mainContentId}`}>
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <Link aria-label="Ir para o início" className={styles.brand} href={brandHref}>
          {brand}
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

        <div className={`${styles.actions} ${styles.desktopActions}`}>
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

        <button
          aria-controls="mobile-navigation"
          aria-expanded={mobileMenuOpen}
          aria-label="Abrir menu de navegação"
          className={styles.menuButton}
          onClick={() => setMobileMenuOpen(true)}
          ref={menuButtonRef}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {mobileMenuOpen ? (
        <div
          className={styles.mobileBackdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeMobileMenu({ restoreFocus: true });
            }
          }}
        >
          <section
            aria-label="Menu de navegação"
            aria-modal="true"
            className={styles.mobileDrawer}
            id="mobile-navigation"
            role="dialog"
          >
            <div className={styles.mobileDrawerHeader}>
              <Link
                aria-label="Ir para o início"
                className={styles.brand}
                href={brandHref}
                onClick={() => closeMobileMenu()}
              >
                {brand}
              </Link>
              <button
                aria-label="Fechar menu de navegação"
                className={styles.closeButton}
                onClick={() => closeMobileMenu({ restoreFocus: true })}
                ref={closeButtonRef}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {navigation.length ? (
              <nav aria-label="Navegação móvel" className={styles.mobileNavigation}>
                {navigation.map((item) => {
                  const active = isCurrentPath(item, currentPath);
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={
                        active ? styles.mobileNavActive : styles.mobileNavLink
                      }
                      href={item.href}
                      key={item.href}
                      onClick={() => closeMobileMenu()}
                    >
                      <span aria-hidden="true" className={styles.mobileNavIcon}>
                        {getNavigationIcon(item.label)}
                      </span>
                      <span>{item.label}</span>
                      <span aria-hidden="true" className={styles.mobileNavArrow}>
                        ›
                      </span>
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            <div className={styles.mobileFooter}>
              {user ? (
                <Link
                  aria-label={`Abrir conta de ${user.name}`}
                  className={styles.mobileAccount}
                  href={accountHref}
                  onClick={() => closeMobileMenu()}
                >
                  <span aria-hidden="true" className={styles.avatar}>
                    {getInitials(user.name)}
                  </span>
                  <span className={styles.userCopy}>
                    <strong>{user.name}</strong>
                    {user.email ? <small>{user.email}</small> : null}
                  </span>
                  <span aria-hidden="true" className={styles.mobileNavArrow}>
                    ›
                  </span>
                </Link>
              ) : null}
              <div className={styles.mobileFooterActions}>{actions}</div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
