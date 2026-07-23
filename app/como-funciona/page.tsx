import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Como funciona",
  description: "Entenda o fluxo de estudo da plataforma OAB Questões.",
};

const steps = [
  {
    number: "01",
    title: "Entre com o Google",
    text: "Uma conta identifica seu progresso e mantém as informações sincronizadas entre dispositivos.",
  },
  {
    number: "02",
    title: "Faça seu diagnóstico",
    text: "O acesso gratuito libera um simulado completo e apresenta suas estatísticas essenciais.",
  },
  {
    number: "03",
    title: "Evolua com os dados",
    text: "O acesso completo libera novos simulados, todo o acervo e análises mais detalhadas.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className={styles.page}>
      <header>
        <Link className={styles.brand} href="/"><strong>OAB</strong> Questões</Link>
        <nav>
          <Link href="/planos">Planos</Link>
          <Link href="/entrar">Entrar</Link>
        </nav>
      </header>

      <section className={styles.intro}>
        <p>COMO FUNCIONA</p>
        <h1>Um caminho curto entre responder e saber o que estudar.</h1>
        <span>
          A plataforma organiza tentativas, respostas e resultados sem depender do navegador que você está usando.
        </span>
      </section>

      <section className={styles.steps}>
        {steps.map((step) => (
          <article key={step.number}>
            <span>{step.number}</span>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
          </article>
        ))}
      </section>

      <section className={styles.detail}>
        <div>
          <p>NO GRATUITO</p>
          <h2>Um simulado e estatísticas básicas.</h2>
        </div>
        <div>
          <p>NO COMPLETO</p>
          <h2>Acesso integral à plataforma.</h2>
        </div>
        <Link href="/entrar">Começar gratuitamente →</Link>
      </section>
    </main>
  );
}
