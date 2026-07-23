import type { Metadata } from "next";

import { Pagination } from "@/components/ui";
import { listAuditLogs } from "@/lib/data/admin";
import { getTotalPages } from "@/lib/pagination";

import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Auditoria — Admin" };

const formatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const result = await listAuditLogs(params.page);
  const totalPages = getTotalPages(result.total, result.pageSize);
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>REGISTRO DE AUDITORIA</p><h1>Ações administrativas</h1><span>Histórico append-only das operações sensíveis, 10 por página.</span></div>
      </header>
      <section className={styles.tablePanel}>
        <div className={styles.tableSummary}><span>{result.total} evento(s)</span><span>Página {result.page} de {totalPages}</span></div>
        {result.logs.length ? <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Data</th><th>Ação</th><th>Administrador</th><th>Entidade</th><th>Motivo</th></tr></thead>
          <tbody>{result.logs.map((log) => <tr key={log.id}>
            <td className={styles.muted}>{formatter.format(log.createdAt)}</td>
            <td><strong>{log.action}</strong></td>
            <td><div className={styles.identityCell}><strong>{log.actorName ?? "Sistema"}</strong><span>{log.actorEmail ?? "—"}</span></div></td>
            <td>{log.entityType}<br /><span className={styles.muted}>{log.entityId}</span></td>
            <td className={styles.muted}>{log.reason ?? "—"}</td>
          </tr>)}</tbody>
        </table></div> : <div className={styles.empty}><h2>Nenhum evento</h2><p>As próximas alterações administrativas aparecerão aqui.</p></div>}
        <div className={styles.paginationWrap}><Pagination basePath="/admin/auditoria" currentPage={result.page} totalPages={totalPages} /></div>
      </section>
    </div>
  );
}
