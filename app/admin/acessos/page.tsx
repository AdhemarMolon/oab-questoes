import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui";
import { listManualAccessGrants } from "@/lib/data/admin";

import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Acessos presente — Admin" };

const formatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function AdminAccessPage() {
  const grants = await listManualAccessGrants();
  const now = new Date();
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>ACESSOS MANUAIS</p><h1>Presentes e cortesias</h1><span>Concessões administrativas separadas de assinaturas e compras reais.</span></div>
        <Link className={styles.primaryLink} href="/admin/usuarios">Escolher usuário</Link>
      </header>

      <section className={styles.tablePanel}>
        <div className={styles.tableSummary}><span>{grants.length} concessão(ões)</span><span>Presentes não entram na métrica de pagantes</span></div>
        {grants.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Usuário</th><th>Plano</th><th>Origem</th><th>Status</th><th>Período</th><th>Motivo</th><th /></tr></thead>
              <tbody>
                {grants.map((grant) => {
                  const active = !grant.revokedAt && grant.startsAt <= now && (!grant.endsAt || grant.endsAt > now);
                  return <tr key={grant.id}>
                    <td><div className={styles.identityCell}><strong>{grant.userName}</strong><span>{grant.userEmail}</span></div></td>
                    <td><Badge variant="premium">{grant.plan}</Badge></td>
                    <td>{grant.source}</td>
                    <td><Badge variant={active ? "success" : "neutral"}>{active ? "Ativo" : grant.revokedAt ? "Revogado" : "Expirado"}</Badge></td>
                    <td className={styles.muted}>{formatter.format(grant.startsAt)}<br />{grant.endsAt ? `até ${formatter.format(grant.endsAt)}` : "sem vencimento"}</td>
                    <td className={styles.muted}>{grant.note || "—"}</td>
                    <td><Link className={styles.rowLink} href={`/admin/usuarios/${grant.userId}`}>Abrir usuário →</Link></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : <div className={styles.empty}><h2>Nenhum presente concedido</h2><p>Abra um usuário para conceder o primeiro acesso.</p></div>}
      </section>
    </div>
  );
}
