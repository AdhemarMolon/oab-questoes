import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { Badge } from "@/components/ui";
import { getUserBillingSummary } from "@/lib/billing/data";
import { getUserAccess } from "@/lib/data/access";
import { requireUser } from "@/lib/session";

import {
  cancelOwnSubscriptionAction,
  deleteOwnAccountAction,
} from "./actions";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Minha conta" };

type AccountSearchParams = {
  erro?: string | string[];
  assinatura?: string | string[];
};

const PLAN_LABELS = {
  FREE: "Gratuito",
  MONTHLY: "Mensal",
  ANNUAL: "Anual",
  LIFETIME: "Vitalício",
} as const;

const ORDER_STATUS_LABELS = {
  PENDING: "Pendente",
  PAID: "Pago",
  FAILED: "Falhou",
  EXPIRED: "Expirou",
  REFUNDED: "Reembolsado",
} as const;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<AccountSearchParams>;
}) {
  const [session, params] = await Promise.all([requireUser(), searchParams]);
  const [access, billing] = await Promise.all([
    getUserAccess(session.user.id),
    getUserBillingSummary(session.user.id),
  ]);
  const errorMessage = Array.isArray(params.erro)
    ? params.erro[0]
    : params.erro;
  const subscriptionMessage = params.assinatura
    ? "Assinatura cancelada. As próximas cobranças foram interrompidas."
    : null;
  const activeSubscriptions = billing.subscriptions.filter(
    (subscription) =>
      subscription.status === "ACTIVE" ||
      subscription.status === "PAST_DUE",
  );

  return (
    <main className={styles.page} id="main-content">
      <header>
        <p>MINHA CONTA</p>
        <h1>Perfil e acesso</h1>
        <span>Seus dados de identidade são fornecidos pela conta Google.</span>
      </header>

      {errorMessage ? (
        <p className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      ) : null}
      {subscriptionMessage ? (
        <p className={styles.successMessage} role="status">
          {subscriptionMessage}
        </p>
      ) : null}

      <div className={styles.columns}>
        <section className={styles.panel}>
          <div className={styles.profile}>
            <span aria-hidden="true">{session.user.name.charAt(0).toUpperCase()}</span>
            <div><h2>{session.user.name}</h2><p>{session.user.email}</p></div>
          </div>
          <dl>
            <div><dt>Login</dt><dd>Google OAuth</dd></div>
            <div><dt>E-mail verificado</dt><dd>{session.user.emailVerified ? "Sim" : "Pendente"}</dd></div>
            <div><dt>Função</dt><dd>{session.user.role === "admin" ? "Administrador" : "Usuário"}</dd></div>
          </dl>
          <div className={styles.signOut}><SignOutButton /></div>
        </section>

        <section className={`${styles.panel} ${styles.accessPanel}`}>
          <div className={styles.panelTop}><span>SEU PLANO</span><Badge variant={access.hasFullAccess ? "premium" : "neutral"}>{access.hasFullAccess ? access.effectivePlan : "FREE"}</Badge></div>
          <h2>{access.hasFullAccess ? "Acesso completo ativo" : "Acesso gratuito"}</h2>
          <p>{access.hasFullAccess ? "Você pode usar todo o acervo, novos simulados e estatísticas avançadas." : "Você pode fazer e refazer o simulado gratuito, mantendo suas estatísticas básicas."}</p>
          {access.fullAccessEndsAt && <small>Válido até {new Intl.DateTimeFormat("pt-BR").format(access.fullAccessEndsAt)}</small>}
          <Link href={access.hasFullAccess ? "/simulados" : "/planos"}>{access.hasFullAccess ? "Ir para simulados →" : "Conhecer modalidades →"}</Link>
        </section>
      </div>

      <section className={styles.note}>
        <strong>Pagamentos protegidos pela AbacatePay.</strong>
        <p>
          A confirmação, as renovações e os cancelamentos são sincronizados
          automaticamente com o seu acesso à plataforma.
        </p>
      </section>

      <section className={styles.billingPanel} id="cobrancas">
        <div className={styles.billingIntro}>
          <div>
            <span>COBRANÇAS</span>
            <h2>Assinaturas e pagamentos</h2>
          </div>
          <Link href="/planos">Ver planos</Link>
        </div>

        {activeSubscriptions.length ? (
          <div className={styles.subscriptionList}>
            {activeSubscriptions.map((subscription) => (
              <article key={subscription.id}>
                <div>
                  <Badge
                    variant={
                      subscription.status === "ACTIVE" ? "success" : "info"
                    }
                  >
                    {subscription.status === "ACTIVE"
                      ? "Ativa"
                      : "Pagamento pendente"}
                  </Badge>
                  <h3>
                    Assinatura {PLAN_LABELS[subscription.plan]}
                  </h3>
                  {subscription.currentPeriodEnd ? (
                    <p>
                      Ciclo atual até{" "}
                      {new Intl.DateTimeFormat("pt-BR").format(
                        subscription.currentPeriodEnd,
                      )}
                    </p>
                  ) : null}
                </div>
                <details>
                  <summary>Cancelar assinatura</summary>
                  <form action={cancelOwnSubscriptionAction}>
                    <input
                      name="subscriptionId"
                      type="hidden"
                      value={subscription.id}
                    />
                    <p>
                      O cancelamento é imediato, encerra o acesso deste plano e
                      interrompe cobranças futuras.
                    </p>
                    <button type="submit">Confirmar cancelamento</button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.noSubscription}>
            Você não possui assinatura recorrente ativa.
          </p>
        )}

        {billing.orders.length ? (
          <div className={styles.orderList}>
            <h3>Pagamentos recentes</h3>
            <div>
              {billing.orders.map((order) => (
                <article key={order.id}>
                  <div>
                    <strong>{PLAN_LABELS[order.plan]}</strong>
                    <span>
                      {new Intl.DateTimeFormat("pt-BR").format(order.createdAt)}
                    </span>
                  </div>
                  <span>{ORDER_STATUS_LABELS[order.status]}</span>
                  <strong>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: order.currency,
                    }).format(order.amountCents / 100)}
                  </strong>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.privacyPanel}>
        <div>
          <span>PRIVACIDADE E CONTROLE</span>
          <h2>Seus dados, suas escolhas.</h2>
        </div>
        <p>
          Consulte como seus dados são usados ou fale diretamente com o
          responsável pela plataforma.
        </p>
        <nav>
          <Link href="/privacidade">Política de Privacidade</Link>
          <Link href="/contato">Entrar em contato</Link>
        </nav>
      </section>

      <section className={styles.dangerZone} id="excluir-conta">
        <div className={styles.dangerIntro}>
          <span>ZONA DE RISCO</span>
          <h2>Excluir minha conta</h2>
          <p>
            Remove sua identificação, vínculo com Google, sessões, favoritos e
            acessos. Tentativas podem permanecer anonimizadas para preservar
            estatísticas e registros necessários.
          </p>
        </div>

        <details>
          <summary>Quero excluir minha conta</summary>
          <div className={styles.deletionDetails}>
            <strong>Esta ação é permanente e não pode ser desfeita.</strong>
            <p>
              Seu histórico não poderá ser recuperado se você criar outra conta
              futuramente.
            </p>
            <form action={deleteOwnAccountAction}>
              <label className={styles.acknowledgement}>
                <input name="acknowledged" required type="checkbox" />
                <span>
                  Entendo que perderei o acesso e que a exclusão é irreversível.
                </span>
              </label>
              <label className={styles.confirmationField}>
                <span>Digite EXCLUIR para confirmar</span>
                <input
                  autoComplete="off"
                  name="confirmation"
                  pattern="EXCLUIR"
                  required
                  spellCheck={false}
                  type="text"
                />
              </label>
              <button type="submit">Excluir conta permanentemente</button>
            </form>
          </div>
        </details>
      </section>
    </main>
  );
}
