"use client";

import { usePathname } from "next/navigation";

import { AdminShell } from "./AdminShell";

const navigation = [
  { href: "/admin", label: "Visão geral", icon: "⌂", match: "exact" as const },
  { href: "/admin/usuarios", label: "Usuários", icon: "◉", match: "prefix" as const },
  { href: "/admin/acessos", label: "Acessos presente", icon: "◇", match: "prefix" as const },
  { href: "/admin/comunicados", label: "Comunicados", icon: "✦", match: "prefix" as const },
  { href: "/admin/questoes", label: "Questões", icon: "§", match: "prefix" as const },
  { href: "/admin/auditoria", label: "Auditoria", icon: "≡", match: "prefix" as const },
];

export function AdminPlatformShell({
  children,
  administrator,
}: {
  children: React.ReactNode;
  administrator: { name: string };
}) {
  const pathname = usePathname();
  return (
    <AdminShell
      administrator={{ name: administrator.name, roleLabel: "Administrador" }}
      backHref="/painel"
      currentPath={pathname}
      navigation={navigation}
    >
      {children}
    </AdminShell>
  );
}
