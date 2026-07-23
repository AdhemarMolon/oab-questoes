import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui";
import { getAdminUser } from "@/lib/data/admin";

import {
  changeUserRoleAction,
  changeUserStatusAction,
  grantGiftAccessAction,
  revokeGiftAccessAction,
} from "../../actions";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "Detalhes do usuário — Admin" };

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const [{ userId }, messages] = await Promise.all([params, searchParams]);
  const data = await getAdminUser(userId);
  if (!data) notFound();

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p>DETALHES DO USUÁRIO</p>
          <h1>{data.user.name}</h1>
          <span>{data.user.email}</span>
        </div>
        <Link className={styles.secondaryLink} href="/admin/usuarios">← Voltar à lista</Link>
      </header>

      {messages.sucesso && <div className={`${styles.notice} ${styles.successNotice}`}>{messages.sucesso}</div>}
      {messages.erro && <div className={`${styles.notice} ${styles.errorNotice}`}>{messages.erro}</div>}

      <div className={styles.twoColumns}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><h2>Conta e acesso</h2><p>Função administrativa e entitlement são independentes.</p></div>
            <Badge variant={data.access.hasFullAccess ? "premium" : "neutral"}>{data.access.hasFullAccess ? data.access.effectivePlan : "FREE"}</Badge>
          </div>
          <dl className={styles.detailList}>
            <div><dt>ID</dt><dd>{data.user.id}</dd></div>
            <div><dt>Função</dt><dd>{data.user.role === "admin" ? "Administrador" : "Usuário"}</dd></div>
            <div><dt>Status</dt><dd>{data.user.status === "ACTIVE" ? "Ativo" : "Suspenso"}</dd></div>
            <div><dt>Pagante</dt><dd>{data.access.isPaying ? "Sim" : "Não"}</dd></div>
            <div><dt>Simulados</dt><dd>{data.attemptCount}</dd></div>
            <div><dt>Criado em</dt><dd>{dateTime.format(data.user.createdAt)}</dd></div>
          </dl>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><h2>Função e status</h2><p>Alterações revogam as sessões antigas e entram na auditoria.</p></div></div>
          <div className={styles.stack}>
            <form action={changeUserRoleAction} className={styles.inlineForm}>
              <input name="userId" type="hidden" value={data.user.id} />
              <label className={styles.formField}>Função<select defaultValue={data.user.role} name="role"><option value="user">Usuário</option><option value="admin">Administrador</option></select></label>
              <button className={styles.actionButton} type="submit">Salvar função</button>
            </form>
            <form action={changeUserStatusAction} className={styles.formGrid}>
              <input name="userId" type="hidden" value={data.user.id} />
              <label className={styles.formField}>Novo status<select defaultValue={data.user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} name="status"><option value="ACTIVE">Ativo</option><option value="SUSPENDED">Suspenso</option></select></label>
              <label className={styles.formField}>Motivo<input name="reason" placeholder="Motivo administrativo" required /></label>
              <div className={styles.fullField}><button className={data.user.status === "ACTIVE" ? styles.dangerButton : styles.actionButton} type="submit">{data.user.status === "ACTIVE" ? "Suspender usuário" : "Reativar usuário"}</button></div>
            </form>
          </div>
        </section>
      </div>

      <div className={styles.twoColumns} style={{ marginTop: 16 }}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><h2>Conceder acesso presente</h2><p>O presente dá acesso completo, mas não conta como pagamento.</p></div></div>
          <form action={grantGiftAccessAction} className={styles.formGrid}>
            <input name="userId" type="hidden" value={data.user.id} />
            <label className={styles.formField}>Modalidade<select defaultValue="monthly" name="planCode"><option value="monthly">Mensal</option><option value="annual">Anual</option><option value="lifetime">Vitalício</option></select></label>
            <label className={styles.formField}>Duração em dias<input min="1" max="3650" name="durationDays" placeholder="30/365; vazio no vitalício" type="number" /></label>
            <label className={`${styles.formField} ${styles.fullField}`}>Motivo<textarea name="reason" placeholder="Campanha, cortesia, suporte…" required /></label>
            <div className={styles.fullField}><button className={styles.actionButton} type="submit">Conceder presente</button></div>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><h2>Histórico de acessos</h2><p>{data.grants.length} concessão(ões) registrada(s).</p></div></div>
          <div className={styles.grantList}>
            {data.grants.length ? data.grants.map((grant) => {
              const active = !grant.revokedAt && grant.startsAt <= new Date() && (!grant.endsAt || grant.endsAt > new Date());
              return (
                <article className={styles.grant} key={grant.id}>
                  <div className={styles.grantTop}>
                    <div><Badge variant={active ? "premium" : "neutral"}>{grant.plan}</Badge> <Badge variant={grant.source === "GIFT" ? "info" : "neutral"}>{grant.source}</Badge></div>
                    <span className={styles.muted}>{active ? "Ativo" : grant.revokedAt ? "Revogado" : "Expirado"}</span>
                  </div>
                  <p>Início: {dateTime.format(grant.startsAt)} · Fim: {grant.endsAt ? dateTime.format(grant.endsAt) : "sem vencimento"}</p>
                  {active && ["GIFT", "ADMIN"].includes(grant.source) && (
                    <form action={revokeGiftAccessAction} className={styles.inlineForm} style={{ marginTop: 12 }}>
                      <input name="grantId" type="hidden" value={grant.id} /><input name="userId" type="hidden" value={data.user.id} />
                      <label className={styles.formField}>Motivo da revogação<input name="reason" required /></label>
                      <button className={styles.dangerButton} type="submit">Revogar</button>
                    </form>
                  )}
                </article>
              );
            }) : <div className={styles.empty}><p>Nenhum acesso registrado.</p></div>}
          </div>
        </section>
      </div>

      <section className={styles.panel} style={{ marginTop: 16 }}>
        <div className={styles.panelHeader}><div><h2>Dados financeiros</h2><p>Pedidos e assinaturas são somente leitura; presentes não criam cobranças falsas.</p></div></div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Tipo</th><th>Plano</th><th>Status</th><th>Provedor</th><th>Criado em</th></tr></thead>
            <tbody>
              {data.orders.map((order) => <tr key={order.id}><td>Pedido</td><td>{order.plan}</td><td>{order.status}</td><td>{order.provider}</td><td>{dateTime.format(order.createdAt)}</td></tr>)}
              {data.subscriptions.map((subscription) => <tr key={subscription.id}><td>Assinatura</td><td>{subscription.plan}</td><td>{subscription.status}</td><td>{subscription.provider}</td><td>{dateTime.format(subscription.createdAt)}</td></tr>)}
              {!data.orders.length && !data.subscriptions.length && <tr><td className={styles.muted} colSpan={5}>Nenhuma cobrança registrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
