import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui";
import { getUserBillingOrder } from "@/lib/billing/data";
import { requireUser } from "@/lib/session";

import { PaymentStatusRefresh } from "./PaymentStatus";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Status do pagamento" };

type PaymentPageProps = {
  searchParams: Promise<{ pedido?: string | string[] }>;
};

const STATUS_COPY = {
  PENDING: {
    badge: "Processando",
    title: "Estamos confirmando seu pagamento.",
    description:
      "O AbacatePay já recebeu a operação. Esta página será atualizada automaticamente assim que a confirmação chegar.",
  },
  PAID: {
    badge: "Confirmado",
    title: "Pagamento confirmado e acesso liberado.",
    description:
      "Seu plano já está ativo. Você pode seguir para os simulados e usar todos os recursos.",
  },
  FAILED: {
    badge: "Não concluído",
    title: "O pagamento não foi concluído.",
    description:
      "Você pode voltar aos planos e tentar novamente. Nenhum acesso foi liberado por esta operação.",
  },
  EXPIRED: {
    badge: "Expirado",
    title: "Este pagamento expirou.",
    description: "Volte aos planos para gerar um novo checkout.",
  },
  REFUNDED: {
    badge: "Reembolsado",
    title: "Este pagamento foi reembolsado.",
    description:
      "O acesso relacionado a esta compra foi encerrado. Fale conosco se precisar de ajuda.",
  },
} as const;

export default async function PaymentPage({
  searchParams,
}: PaymentPageProps) {
  const [session, params] = await Promise.all([requireUser(), searchParams]);
  const rawOrderId = Array.isArray(params.pedido)
    ? params.pedido[0]
    : params.pedido;
  const order = rawOrderId
    ? await getUserBillingOrder(session.user.id, rawOrderId)
    : null;

  if (!order) {
    return (
      <main className={styles.page} id="main-content">
        <section className={styles.card}>
          <p>PAGAMENTO</p>
          <h1>Pedido não encontrado.</h1>
          <span>
            Confira o link usado ou acesse sua conta para consultar as
            cobranças recentes.
          </span>
          <div className={styles.actions}>
            <Link href="/conta">Ir para minha conta</Link>
            <Link href="/planos">Ver planos</Link>
          </div>
        </section>
      </main>
    );
  }

  const copy = STATUS_COPY[order.status];
  const pending = order.status === "PENDING";

  return (
    <main className={styles.page} id="main-content">
      <PaymentStatusRefresh pending={pending} />
      <section className={styles.card}>
        <div className={styles.cardTop}>
          <p>PAGAMENTO · ABACATEPAY</p>
          <Badge
            variant={
              order.status === "PAID"
                ? "success"
                : order.status === "PENDING"
                  ? "info"
                  : "neutral"
            }
          >
            {copy.badge}
          </Badge>
        </div>
        <h1>{copy.title}</h1>
        <span>{copy.description}</span>
        <dl>
          <div>
            <dt>Plano</dt>
            <dd>{order.plan}</dd>
          </div>
          <div>
            <dt>Valor</dt>
            <dd>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: order.currency,
              }).format(order.amountCents / 100)}
            </dd>
          </div>
          <div>
            <dt>Pedido</dt>
            <dd>{order.id.slice(0, 8).toUpperCase()}</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          <Link href={order.status === "PAID" ? "/simulados" : "/planos"}>
            {order.status === "PAID" ? "Ir para simulados" : "Voltar aos planos"}
          </Link>
          <Link href="/conta">Minha conta</Link>
        </div>
        {pending ? (
          <small>
            A confirmação normalmente leva poucos segundos. Você também pode
            atualizar esta página manualmente.
          </small>
        ) : null}
      </section>
    </main>
  );
}
