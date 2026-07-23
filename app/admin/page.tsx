import type { Metadata } from "next";
import Link from "next/link";

import { getAdminMetrics } from "@/lib/data/admin";

import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Administração" };

export default async function AdminDashboardPage() {
  const metrics = await getAdminMetrics();
  const cards = [
    ["Usuários", metrics.users, `${metrics.admins} administrador(es)`],
    ["Pagantes", metrics.payingUsers, "Somente pagamentos reais"],
    ["Acesso completo", metrics.fullAccessUsers, "Inclui presentes ativos"],
    ["Questões", metrics.questions, `${metrics.attempts} tentativa(s)`],
  ] as const;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p>VISÃO GERAL</p>
          <h1>Painel administrativo</h1>
          <span>Usuários, acessos, conteúdo e operações sensíveis em um só lugar.</span>
        </div>
      </header>

      <section className={styles.stats} aria-label="Indicadores administrativos">
        {cards.map(([label, value, note]) => (
          <article className={styles.metric} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>

      <section className={styles.quickGrid}>
        <Link href="/admin/usuarios">
          <div><strong>Gerenciar usuários</strong><span>Paginação de 10, funções, status e detalhes.</span></div><b>→</b>
        </Link>
        <Link href="/admin/acessos">
          <div><strong>Acessos presente</strong><span>Concessões manuais separadas dos pagamentos.</span></div><b>→</b>
        </Link>
        <Link href="/admin/comunicados">
          <div><strong>Publicar comunicado</strong><span>{metrics.publishedAnnouncements} comunicado(s) publicado(s).</span></div><b>→</b>
        </Link>
        <Link href="/admin/questoes">
          <div><strong>Editar questões</strong><span>Criação, conferência, publicação e exclusão lógica.</span></div><b>→</b>
        </Link>
        <Link href="/admin/auditoria">
          <div><strong>Consultar auditoria</strong><span>Histórico das alterações administrativas.</span></div><b>→</b>
        </Link>
      </section>
    </div>
  );
}
