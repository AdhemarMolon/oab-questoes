"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import styles from "./PanelShell.module.css";

type IconName = "home" | "calendar" | "target" | "plan" | "sun" | "errors" | "review" | "heart" | "notes" | "progress" | "chart" | "score";

const groups: Array<{ label: string; items: Array<{ href: string; label: string; icon: IconName }> }> = [
  { label: "Visão geral", items: [{ href: "/painel", label: "Visão Geral", icon: "home" }] },
  { label: "Organização", items: [
    { href: "/painel/planejamento", label: "Planejamento", icon: "calendar" },
    { href: "/painel/metas", label: "Metas", icon: "target" },
    { href: "/painel/plano-de-estudos", label: "Plano de Estudos", icon: "plan" },
  ] },
  { label: "Estudos", items: [
    { href: "/painel/hoje", label: "O que estudar hoje?", icon: "sun" },
    { href: "/painel/caderno-de-erros", label: "Caderno de Erros", icon: "errors" },
    { href: "/painel/revisoes", label: "Revisões", icon: "review" },
    { href: "/painel/favoritas", label: "Questões Favoritas", icon: "heart" },
    { href: "/painel/anotacoes", label: "Minhas Anotações", icon: "notes" },
  ] },
  { label: "Desempenho", items: [
    { href: "/painel/progresso", label: "Meu Progresso", icon: "progress" },
    { href: "/painel/desempenho", label: "Meu Desempenho", icon: "chart" },
    { href: "/painel/meta-40", label: "Meta dos 40 Pontos", icon: "score" },
  ] },
];

const iconPaths: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  plan: <><path d="M4 4h16v16H4zM8 2v4M16 2v4M8 10h8M8 14h6"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  errors: <><path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h3"/><path d="m16 15 4 4M20 15l-4 4"/></>,
  review: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8A7 7 0 0 1 18 6l2 2M17.9 16A7 7 0 0 1 6 18l-2-2"/></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  notes: <><path d="M4 3h16v18H4zM8 7h8M8 11h8M8 15h5"/></>,
  progress: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  chart: <><path d="M4 20V9M10 20V4M16 20v-8M22 20H2"/><path d="m4 8 6-5 6 7 5-5"/></>,
  score: <><path d="M5 3h14v18H5zM9 8h6M9 12h6"/><path d="m9 17 2 2 4-4"/></>,
};

function Icon({ name }: { name: IconName }) {
  return <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="18">{iconPaths[name]}</svg>;
}

function currentLabel(pathname: string) {
  return groups.flatMap((group) => group.items).find((item) => item.href === pathname)?.label ?? "Visão Geral";
}

function LockTooltip() {
  return <span
    aria-label="Disponível apenas para usuários pagantes"
    className={styles.lock}
    data-tooltip="Disponível apenas para usuários pagantes."
    role="img"
    tabIndex={0}
  >
    <svg aria-hidden="true" fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <rect height="10" rx="2" width="16" x="4" y="11"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </svg>
  </span>;
}

function Navigation({ pathname, hasAccess, close }: { pathname: string; hasAccess: boolean; close?: () => void }) {
  return <nav aria-label="Ferramentas do Painel" className={styles.navigation}>
    {groups.map((group) => <section className={styles.group} key={group.label}>
      <h2>{group.label}</h2>
      {group.items.map((item) => {
        const active = item.href === "/painel" ? pathname === item.href : pathname.startsWith(item.href);
        const locked = !hasAccess && item.href !== "/painel";
        return <Link aria-current={active ? "page" : undefined} className={`${active ? styles.active : styles.link} ${locked ? styles.lockedLink : ""}`} href={locked ? "/planos" : item.href} key={item.href} onClick={close}>
          <Icon name={item.icon}/><span>{item.label}</span>{locked ? <LockTooltip/> : null}
        </Link>;
      })}
    </section>)}
  </nav>;
}

export function PanelShell({ children, hasAccess }: { children: ReactNode; hasAccess: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", close); };
  }, [open]);
  const label = currentLabel(pathname);
  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTitle}><span>MINHA PREPARAÇÃO</span><strong>Central de estudos</strong></div>
      <Navigation hasAccess={hasAccess} pathname={pathname}/>
    </aside>
    <div className={styles.workspace}>
      <div className={styles.mobileBar}>
        <button aria-expanded={open} aria-label="Abrir ferramentas do Painel" onClick={() => setOpen(true)} type="button"><span/><span/><span/></button>
        <div><small>PAINEL</small><strong>{label}</strong></div>
      </div>
      <div className={styles.breadcrumb} aria-label="Navegação estrutural"><Link href="/painel">Painel</Link><span>/</span><strong>{label}</strong></div>
      {hasAccess || pathname === "/painel" ? children : <main className={styles.accessGate} id="main-content">
        <section>
          <span className={styles.accessGateIcon}><LockTooltip/></span>
          <p>RECURSO DO ACESSO COMPLETO</p>
          <h1>Sua central de estudos está protegida.</h1>
          <strong>As ferramentas do Painel são exclusivas para usuários pagantes.</strong>
          <span>Escolha um plano para liberar planejamento, revisões, anotações, métricas e todos os recursos da sidebar.</span>
          <Link href="/planos">Conhecer os planos <span aria-hidden="true">→</span></Link>
        </section>
      </main>}
    </div>
    {open ? <div className={styles.backdrop} onMouseDown={(event) => event.currentTarget === event.target && setOpen(false)}>
      <aside aria-label="Menu de ferramentas do Painel" aria-modal="true" className={styles.drawer} role="dialog">
        <header><div><small>MINHA PREPARAÇÃO</small><strong>Central de estudos</strong></div><button aria-label="Fechar menu" onClick={() => setOpen(false)} type="button">×</button></header>
        <Navigation close={() => setOpen(false)} hasAccess={hasAccess} pathname={pathname}/>
      </aside>
    </div> : null}
  </div>;
}
