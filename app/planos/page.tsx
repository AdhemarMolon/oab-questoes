import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Planos",
  description: "Compare o acesso gratuito, mensal, anual e vitalício da plataforma.",
};

const plans = [
  {
    code: "monthly",
    name: "Mensal",
    description: "Flexibilidade para estudar no seu ritmo, sem compromisso de longo prazo.",
    note: "Cobrança recorrente mensal",
  },
  {
    code: "annual",
    name: "Anual",
    description: "Um ciclo completo de preparação com acesso contínuo à plataforma.",
    note: "Cobrança recorrente anual",
    featured: true,
  },
  {
    code: "lifetime",
    name: "Vitalício",
    description: "Uma única compra para manter o acesso completo enquanto a plataforma existir.",
    note: "Pagamento único",
  },
];

export default function PlansPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <strong>OAB</strong> Questões
        </Link>
        <Link href="/entrar">Entrar</Link>
      </header>

      <section className={styles.intro}>
        <p>ACESSO QUE ACOMPANHA SEU PLANO DE ESTUDO</p>
        <h1>Comece no gratuito. Libere tudo quando estiver pronto.</h1>
        <span>
          Os valores e o checkout serão ativados quando a integração de pagamentos for concluída.
          A estrutura já diferencia cobrança mensal, anual e compra vitalícia.
        </span>
      </section>

      <section className={styles.planGrid} aria-label="Modalidades de acesso">
        <article className={styles.freePlan}>
          <div>
            <span>GRATUITO</span>
            <h2>Experimente o método</h2>
            <p>Seu primeiro diagnóstico, sem cadastrar cartão.</p>
          </div>
          <ul>
            <li>1 simulado completo</li>
            <li>Estatísticas básicas</li>
            <li>Progresso sincronizado</li>
          </ul>
          <Link href="/entrar">Começar grátis</Link>
        </article>

        {plans.map((plan) => (
          <article className={plan.featured ? styles.featured : ""} key={plan.code}>
            {plan.featured && <b className={styles.recommended}>MAIS EQUILIBRADO</b>}
            <div>
              <span>ACESSO COMPLETO</span>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
            </div>
            <ul>
              <li>Simulados sem limite</li>
              <li>Acervo completo de questões</li>
              <li>Estatísticas detalhadas</li>
              <li>{plan.note}</li>
            </ul>
            <span className={styles.pending}>Preço a definir</span>
          </article>
        ))}
      </section>

      <section className={styles.faq}>
        <h2>O acesso completo é o mesmo nos três formatos.</h2>
        <p>
          A modalidade muda apenas a forma de cobrança e a duração. Presentes concedidos pela
          administração também liberam o acesso completo, mas não são contabilizados como usuários pagantes.
        </p>
        <Link href="/entrar">Criar minha conta →</Link>
      </section>
    </main>
  );
}
