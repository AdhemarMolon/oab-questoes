"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth/SignOutButton";

import { AppHeader } from "./AppHeader";
import styles from "./PlatformHeader.module.css";

type PlatformHeaderProps = {
  user: {
    name: string;
    email: string;
    role: "user" | "admin";
  };
};

const navigation = [
  { href: "/painel", label: "Visão geral", match: "exact" as const },
  { href: "/simulados", label: "Simulados", match: "prefix" as const },
  { href: "/questoes", label: "Questões", match: "prefix" as const },
];

export function PlatformHeader({ user }: PlatformHeaderProps) {
  const pathname = usePathname();

  return (
    <AppHeader
      accountHref="/conta"
      actions={
        <div className={styles.actions}>
          {user.role === "admin" && <Link href="/admin">Admin</Link>}
          <SignOutButton />
        </div>
      }
      currentPath={pathname}
      navigation={navigation}
      user={{ name: user.name, email: user.email }}
    />
  );
}
