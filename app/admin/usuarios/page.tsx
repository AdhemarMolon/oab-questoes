import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Pagination } from "@/components/ui";
import { listAdminUsers, type UserAccessFilter } from "@/lib/data/admin";
import { getTotalPages } from "@/lib/pagination";

import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Usuários — Admin" };

type SearchParams = {
  page?: string;
  q?: string;
  role?: "all" | "user" | "admin";
  status?: "all" | "ACTIVE" | "SUSPENDED" | "ANONYMIZED";
  access?: UserAccessFilter;
  sucesso?: string;
  erro?: string;
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const result = await listAdminUsers({
    page: params.page,
    query: params.q,
    role: params.role,
    status: params.status,
    access: params.access,
  });
  const totalPages = getTotalPages(result.total, result.pageSize);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>USUÁRIOS</p><h1>Contas da plataforma</h1><span>{result.total} usuário(s) encontrado(s), 10 por página.</span></div>
      </header>

      {params.sucesso && <div className={`${styles.notice} ${styles.successNotice}`}>{params.sucesso}</div>}
      {params.erro && <div className={`${styles.notice} ${styles.errorNotice}`}>{params.erro}</div>}

      <section className={styles.filterPanel}>
        <form method="get">
          <label>Buscar<input defaultValue={params.q} name="q" placeholder="Nome ou e-mail" /></label>
          <label>Função<select defaultValue={params.role ?? "all"} name="role"><option value="all">Todas</option><option value="user">Usuário</option><option value="admin">Admin</option></select></label>
          <label>Status<select defaultValue={params.status ?? "all"} name="status"><option value="all">Todos</option><option value="ACTIVE">Ativo</option><option value="SUSPENDED">Suspenso</option></select></label>
          <label>Acesso<select defaultValue={params.access ?? "all"} name="access"><option value="all">Todos</option><option value="free">Gratuito</option><option value="full">Completo</option><option value="paying">Pagante</option><option value="gift">Presente</option></select></label>
          <button type="submit">Filtrar</button>
        </form>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.tableSummary}><span>Página {result.page} de {totalPages}</span><span>{result.users.length} registro(s) nesta página</span></div>
        {result.users.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Usuário</th><th>Função</th><th>Status</th><th>Acesso</th><th>Pagante</th><th>Cadastro</th><th /></tr></thead>
              <tbody>
                {result.users.map((item) => (
                  <tr key={item.id}>
                    <td><div className={styles.identityCell}><strong>{item.name}</strong><span>{item.email}</span></div></td>
                    <td><Badge variant={item.role === "admin" ? "admin" : "neutral"}>{item.role === "admin" ? "Admin" : "Usuário"}</Badge></td>
                    <td><Badge variant={item.status === "ACTIVE" ? "success" : "danger"}>{item.status === "ACTIVE" ? "Ativo" : "Suspenso"}</Badge></td>
                    <td><Badge variant={item.access.hasFullAccess ? "premium" : "neutral"}>{item.access.hasFullAccess ? item.access.effectivePlan : "Gratuito"}</Badge></td>
                    <td>{item.access.isPaying ? <Badge variant="success" withDot>Sim</Badge> : <span className={styles.muted}>Não</span>}</td>
                    <td className={styles.muted}>{new Intl.DateTimeFormat("pt-BR").format(item.createdAt)}</td>
                    <td><Link className={styles.rowLink} href={`/admin/usuarios/${item.id}`}>Detalhes →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className={styles.empty}><h2>Nenhum usuário encontrado</h2><p>Ajuste os filtros e tente novamente.</p></div>}
        <div className={styles.paginationWrap}>
          <Pagination basePath="/admin/usuarios" currentPage={result.page} searchParams={{ q: params.q, role: params.role, status: params.status, access: params.access }} totalPages={totalPages} />
        </div>
      </section>
    </div>
  );
}
