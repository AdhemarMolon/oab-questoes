import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/shell";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { getBillingCatalog } from "@/lib/billing/config";

import { CheckoutButton } from "./CheckoutButton";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planos",
  description:
    "Escolha a modalidade de acesso à Minha OAB e prepare-se para a 1ª fase.",
};

const plans = [
  {
    code: "MONTHLY",
    name: "Mensal",
    eyebrow: "Flexibilidade",
    billing: "Cobrança mensal",
    discount: null,
    description: "Para estudar no seu ritmo, sem compromisso de longo prazo.",
    featured: false,
  },
  {
    code: "ANNUAL",
    name: "Anual",
    eyebrow: "Melhor escolha",
    billing: "Cobrança anual",
    discount: "20% de desconto",
    description: "Para manter uma preparação contínua ao longo de todo o ano.",
    featured: true,
  },
  {
    code: "LIFETIME",
    name: "Vitalício",
    eyebrow: "Acesso permanente",
    billing: "Pagamento único",
    discount: null,
    description: "Para ter o conteúdo sempre disponível, sem renovação.",
    featured: false,
  },
] as const;

const benefits = [
  "Novas tentativas de simulados",
  "Banco completo de questões",
  "Desempenho por disciplina",
  "Histórico e progresso salvos",
] as const;

export default function PlansPage() {
  const billingCatalog = getBillingCatalog();
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <main className={styles.page} id="main-content">
      <SiteHeader />

      <section className={styles.pricing} aria-labelledby="plans-title">
        <header className={styles.intro}>
          <p className={styles.eyebrow}>
            <span>PLANOS DE ACESSO</span>
            <i aria-hidden="true" />
            <span>1ª FASE DA OAB</span>
          </p>
          <h1 id="plans-title">
            Escolha como quer <em>se preparar.</em>
          </h1>
          <p>
            Todos os planos completos liberam os mesmos recursos. O que muda é
            apenas a forma de pagamento.
          </p>
        </header>

        <aside className={styles.freeTrial} aria-label="Acesso gratuito">
          <div className={styles.freeIcon} aria-hidden="true">
            01
          </div>
          <div className={styles.freeCopy}>
            <span>COMECE SEM CUSTO</span>
            <strong>Faça seu primeiro diagnóstico gratuitamente.</strong>
            <p>1 simulado completo, resultado geral e progresso salvo.</p>
          </div>
          <div className={styles.freePrice}>
            <span>VALOR</span>
            <strong>R$ 0</strong>
            <small>Sem cartão</small>
          </div>
          <Link className={styles.freeAction} href="/entrar">
            Começar grátis <span aria-hidden="true">→</span>
          </Link>
        </aside>

        <div className={styles.planGrid} aria-label="Modalidades de acesso completo">
          {plans.map((plan) => (
            <article
              className={plan.featured ? styles.featuredCard : styles.planCard}
              key={plan.name}
            >
              {plan.featured ? (
                <span className={styles.featuredBadge}>MAIS ESCOLHIDO</span>
              ) : null}

              <header className={styles.cardHeader}>
                <span>{plan.eyebrow}</span>
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </header>

              <div className={styles.price}>
                <span>VALOR</span>
                <strong>
                  {billingCatalog.find((item) => item.plan === plan.code)
                    ?.amountCents
                    ? currency.format(
                        billingCatalog.find((item) => item.plan === plan.code)!
                          .amountCents! / 100,
                      )
                    : "Em breve"}
                </strong>
                <small>{plan.billing}</small>
                {plan.discount ? (
                  <b className={styles.discount}>{plan.discount}</b>
                ) : null}
              </div>

              <CheckoutButton
                configured={
                  billingCatalog.find((item) => item.plan === plan.code)
                    ?.configured ?? false
                }
                featured={plan.featured}
                plan={plan.code}
              />

              <div className={styles.benefitBlock}>
                <span>ACESSO COMPLETO INCLUI</span>
                <ul>
                  {benefits.map((benefit) => (
                    <li key={benefit}>
                      <span aria-hidden="true">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <footer className={styles.paymentNote}>
          <div>
            <span className={styles.lockIcon} aria-hidden="true">
              ✓
            </span>
            <p>
              <strong>Pagamento seguro</strong>
              <small>Checkout protegido pela AbacatePay</small>
            </p>
          </div>
          <i aria-hidden="true" />
          <p>
            A liberação do acesso acontece automaticamente após a confirmação
            do pagamento.
          </p>
        </footer>
      </section>
      <SiteFooter />
    </main>
  );
}
