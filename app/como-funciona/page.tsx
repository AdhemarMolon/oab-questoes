import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/shell";
import { SiteHeader } from "@/components/shell/SiteHeader";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Entenda como usar a Minha OAB para fazer simulados, acompanhar resultados e organizar seus próximos estudos.",
};

const steps = [
  {
    number: "01",
    label: "Acesse",
    title: "Entre com o Google",
    text: "Sua conta mantém respostas, tentativas e resultados salvos para você continuar de onde parou.",
    result: "Conta e progresso",
  },
  {
    number: "02",
    label: "Resolva",
    title: "Faça seu diagnóstico",
    text: "Comece com um simulado completo gratuito e retome a tentativa quando precisar.",
    result: "Respostas e tentativa",
  },
  {
    number: "03",
    label: "Analise",
    title: "Decida onde avançar",
    text: "Consulte acertos e aproveitamento. No acesso completo, veja também o desempenho por disciplina.",
    result: "Histórico e desempenho",
  },
] as const;

const facts = [
  { value: "1", label: "simulado gratuito" },
  { value: "400", label: "questões no acervo" },
  { value: "20", label: "disciplinas organizadas" },
] as const;

export default function HowItWorksPage() {
  return (
    <main className={styles.page} id="main-content">
      <SiteHeader />

      <section className={styles.workspace}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            <span>COMO FUNCIONA</span>
            <i aria-hidden="true" />
            <span>1ª FASE DA OAB</span>
          </p>

          <h1>
            Da primeira questão ao <em>próximo foco</em> de estudo.
          </h1>

          <p className={styles.lead}>
            Entre, faça um simulado e acompanhe suas tentativas, acertos e
            desempenho. Tudo fica organizado na sua conta.
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/entrar">
              Fazer simulado gratuito <span aria-hidden="true">→</span>
            </Link>
            <Link className={styles.secondaryAction} href="/planos">
              Comparar planos
            </Link>
          </div>

          <p className={styles.accessNote}>
            <span aria-hidden="true">✓</span> Sem cartão para começar
            <i aria-hidden="true" />
            Acesso com Google
          </p>

          <dl className={styles.facts} aria-label="Resumo da plataforma">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.value}</dt>
                <dd>{fact.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <section className={styles.dossier} aria-labelledby="study-cycle-title">
          <header className={styles.dossierHeader}>
            <div>
              <p>SEU CICLO DE ESTUDO</p>
              <h2 id="study-cycle-title">Três etapas. Um histórico contínuo.</h2>
            </div>
            <span className={styles.syncStatus}>
              <i aria-hidden="true" />
              PROGRESSO SALVO
            </span>
          </header>

          <div className={styles.steps}>
            {steps.map((step) => (
              <article key={step.number}>
                <span className={styles.stepNumber}>{step.number}</span>
                <div className={styles.stepCopy}>
                  <span>{step.label}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <div className={styles.stepResult}>
                  <span>FICA REGISTRADO</span>
                  <strong>{step.result}</strong>
                </div>
              </article>
            ))}
          </div>

          <footer className={styles.accessPanel}>
            <div className={styles.accessIntro}>
              <span>TIPOS DE ACESSO</span>
              <strong>Comece grátis. Amplie quando precisar.</strong>
              <Link href="/planos">Ver detalhes →</Link>
            </div>

            <div className={styles.accessOption}>
              <span>GRATUITO</span>
              <strong>1 simulado completo</strong>
              <p>Resultado, estatísticas básicas e tentativa salva.</p>
            </div>

            <div className={styles.accessOption}>
              <span>ACESSO COMPLETO</span>
              <strong>Preparação contínua</strong>
              <p>Novos simulados, acervo e análise por disciplina.</p>
            </div>
          </footer>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
