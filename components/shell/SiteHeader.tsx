"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { useSession } from "@/lib/auth-client";

import { AppHeader, type AppHeaderNavItem } from "./AppHeader";
import styles from "./SiteHeader.module.css";

type SiteHeaderUser = {
  name: string;
  email: string;
  role: "user" | "admin";
};

type SiteHeaderProps = {
  user?: SiteHeaderUser;
};

const publicNavigation: readonly AppHeaderNavItem[] = [
  { href: "/", label: "Início", match: "exact" },
  { href: "/como-funciona", label: "Como funciona", match: "exact" },
  { href: "/estatisticas", label: "Estatísticas", match: "exact" },
  { href: "/planos", label: "Planos", match: "exact" },
];

const authenticatedNavigation: readonly AppHeaderNavItem[] = [
  { href: "/painel", label: "Painel", match: "exact" },
  { href: "/simulados", label: "Simulados", match: "prefix" },
  { href: "/questoes", label: "Questões", match: "prefix" },
];

export function SiteHeader({ user: providedUser }: SiteHeaderProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const sessionUser = session?.user;
  const resolvedUser = providedUser
    ? providedUser
    : sessionUser
      ? {
          name: sessionUser.name,
          email: sessionUser.email,
          role: sessionUser.role === "admin" ? "admin" : ("user" as const),
        }
      : undefined;
  const navigation = resolvedUser
    ? [...publicNavigation, ...authenticatedNavigation]
    : publicNavigation;

  return (
    <AppHeader
      accountHref="/conta"
      actions={
        <div className={styles.actions}>
          {!providedUser && isPending ? (
            <span aria-hidden="true" className={styles.loading} />
          ) : resolvedUser ? (
            <>
              {resolvedUser.role === "admin" ? (
                <Link className={styles.adminLink} href="/admin">
                  Admin
                </Link>
              ) : null}
              <SignOutButton />
            </>
          ) : (
            <Link className={styles.loginLink} href="/entrar">
              Entrar
            </Link>
          )}
        </div>
      }
      brandHref="/"
      currentPath={pathname}
      navigation={navigation}
      user={
        resolvedUser
          ? { name: resolvedUser.name, email: resolvedUser.email }
          : undefined
      }
    />
  );
}
