import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Pagination } from "@/components/ui";
import { listAdminQuestions } from "@/lib/data/admin";
import { getTotalPages } from "@/lib/pagination";

import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Questões — Admin" };

type SearchParams = {
  page?: string;
  q?: string;
  status?: "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
  verification?: "all" | "UNVERIFIED" | "VERIFIED" | "REJECTED";
  sucesso?: string;
  erro?: string;
};

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const result = await listAdminQuestions({ page: params.page, query: params.q, status: params.status, verification: params.verification });
  const totalPages = getTotalPages(result.total, result.pageSize);
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>BANCO DE QUESTÕES</p><h1>Conteúdo da plataforma</h1><span>{result.total} questão(ões), com publicação e verificação independentes.</span></div>
        <Link className={styles.primaryLink} href="/admin/questoes/nova">Nova questão</Link>
      </header>
      {params.sucesso && <div className={`${styles.notice} ${styles.successNotice}`}>{params.sucesso}</div>}
      {params.erro && <div className={`${styles.notice} ${styles.errorNotice}`}>{params.erro}</div>}
      <section className={styles.filterPanel}>
        <form method="get" style={{ gridTemplateColumns: "minmax(240px, 1fr) repeat(2, minmax(150px, .5fr)) auto" }}>
          <label>Buscar<input defaultValue={params.q} name="q" placeholder="ID ou trecho do enunciado" /></label>
          <label>Status<select defaultValue={params.status ?? "all"} name="status"><option value="all">Todos</option><option value="DRAFT">Rascunho</option><option value="PUBLISHED">Publicado</option><option value="ARCHIVED">Arquivado</option></select></label>
          <label>Verificação<select defaultValue={params.verification ?? "all"} name="verification"><option value="all">Todas</option><option value="UNVERIFIED">Não verificada</option><option value="VERIFIED">Verificada</option><option value="REJECTED">Rejeitada</option></select></label>
          <button type="submit">Filtrar</button>
        </form>
      </section>
      <section className={styles.tablePanel}>
        <div className={styles.tableSummary}><span>Página {result.page} de {totalPages}</span><span>10 por página</span></div>
        {result.questions.length ? <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Questão</th><th>Exame</th><th>Matéria</th><th>Status</th><th>Verificação</th><th>Versão</th><th /></tr></thead>
          <tbody>{result.questions.map((question) => <tr key={question.id}>
            <td><div className={styles.identityCell}><strong>{question.externalId} · nº {question.number}</strong><span>{question.statement.slice(0, 100)}…</span></div></td>
            <td>{question.exam}</td><td>{question.subject}</td>
            <td><Badge variant={question.status === "PUBLISHED" ? "success" : question.status === "ARCHIVED" ? "neutral" : "warning"}>{question.status}</Badge></td>
            <td><Badge variant={question.verificationStatus === "VERIFIED" ? "success" : question.verificationStatus === "REJECTED" ? "danger" : "warning"}>{question.verificationStatus}</Badge></td>
            <td>v{question.version}</td><td><Link className={styles.rowLink} href={`/admin/questoes/${question.id}/editar`}>Editar →</Link></td>
          </tr>)}</tbody>
        </table></div> : <div className={styles.empty}><h2>Nenhuma questão encontrada</h2><p>Ajuste os filtros ou crie uma nova questão.</p></div>}
        <div className={styles.paginationWrap}><Pagination basePath="/admin/questoes" currentPage={result.page} searchParams={{ q: params.q, status: params.status, verification: params.verification }} totalPages={totalPages} /></div>
      </section>
    </div>
  );
}
