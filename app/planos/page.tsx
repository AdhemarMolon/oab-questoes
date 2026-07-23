import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Planos",
  description:
    "Compare o acesso gratuito e as modalidades previstas de acesso completo da OAB Questões.",
};

const accessLevels = [
  {
    number: "01",
    status: "Disponível agora",
    statusType: "available",
    name: "Gratuito",
    description: "Para conhecer a plataforma e fazer seu primeiro diagnóstico.",
    benefits: [
      "1 simulado completo",
      "Resultado e estatísticas gerais",
      "Tentativa e progresso salvos",
    ],
    valueLabel: "VALOR",
    value: "R$ 0",
    note: "Sem cartão",
  },
  {
    number: "02",
    status: "Em preparação",
    statusType: "preparing",
    name: "Acesso completo",
    description: "Para continuar treinando e acompanhar sua evolução em detalhe.",
    benefits: [
      "Novas tentativas de simulados",
      "Banco completo de questões",
      "Desempenho por disciplina",
    ],
    valueLabel: "CONTRATAÇÃO",
    value: "Em breve",
    note: "Preços em definição",
  },
] as const;

const modalities = [
  {
    number: "01",
    name: "Mensal",
    description: "Assinatura mensal",
  },
  {
    number: "02",
    name: "Anual",
    description: "Assinatura anual",
  },
  {
    number: "03",
    name: "Vitalício",
    description: "Compra única",
  },
] as const;

export default function PlansPage() {
  return (
    <main className={styles.page} id="main-content">
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="OAB Questões — início">
          <span>OAB</span> Questões
        </Link>

        <nav aria-label="Navegação principal">
          <Link href="/">Início</Link>
          <Link href="/como-funciona">Como funciona</Link>
        </nav>

        <div className={styles.accountLinks}>
          <Link href="/entrar">Entrar</Link>
        </div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            <span>PLANOS DE ACESSO</span>
            <i aria-hidden="true" />
            <span>1ª FASE DA OAB</span>
          </p>

          <h1>
            Comece sem custo. Saiba <em>o que muda</em> depois.
          </h1>

          <p className={styles.lead}>
            O gratuito oferece seu primeiro diagnóstico. No acesso completo,
            as modalidades mensal, anual e vitalícia terão os mesmos recursos;
            somente a cobrança será diferente.
          </p>

          <div className={styles.statusLedger} aria-label="Disponibilidade dos acessos">
            <div>
              <i className={styles.availableDot} aria-hidden="true" />
              <span>DISPONÍVEL AGORA</span>
              <strong>Acesso gratuito</strong>
            </div>
            <div>
              <i className={styles.preparingDot} aria-hidden="true" />
              <span>EM PREPARAÇÃO</span>
              <strong>Acesso completo</strong>
            </div>
          </div>

          <p className={styles.accountHint}>
            Use <strong>Entrar</strong> para criar sua conta com o Google e
            liberar o simulado gratuito.
          </p>

          <blockquote
            className={styles.quote}
            cite="https://rubi.casaruibarbosa.gov.br/bitstream/handle/20.500.11997/16238/FCRB_RuiBarbosa_Oracao_aos_mocos.pdf?isAllowed=y&sequence=1"
          >
            <span aria-hidden="true">“</span>
            <p>Vulgar é o ler, raro o refletir.</p>
            <footer>
              <cite>Rui Barbosa</cite>
              <small>Oração aos Moços</small>
            </footer>
          </blockquote>
        </div>

        <section className={styles.dossier} aria-labelledby="comparison-title">
          <header className={styles.dossierHeader}>
            <div>
              <p>QUADRO COMPARATIVO</p>
              <h2 id="comparison-title">Veja o que cada acesso libera.</h2>
            </div>
            <span className={styles.clearStatus}>SEM SURPRESAS</span>
          </header>

          <div className={styles.accessRows}>
            {accessLevels.map((access) => (
              <article key={access.number}>
                <span className={styles.accessNumber}>{access.number}</span>

                <div className={styles.accessCopy}>
                  <span
                    className={
                      access.statusType === "available"
                        ? styles.availableStatus
                        : styles.preparingStatus
                    }
                  >
                    <i aria-hidden="true" />
                    {access.status}
                  </span>
                  <h3>{access.name}</h3>
                  <p>{access.description}</p>
                </div>

                <ul>
                  {access.benefits.map((benefit) => (
                    <li key={benefit}>
                      <span aria-hidden="true">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>

                <div className={styles.accessValue}>
                  <span>{access.valueLabel}</span>
                  <strong>{access.value}</strong>
                  <small>{access.note}</small>
                </div>
              </article>
            ))}
          </div>

          <footer className={styles.modalities}>
            <div className={styles.modalitiesIntro}>
              <span>FORMAS PREVISTAS</span>
              <strong>Mesmos recursos. Cobranças diferentes.</strong>
            </div>

            {modalities.map((modality) => (
              <div className={styles.modality} key={modality.name}>
                <span>{modality.number}</span>
                <strong>{modality.name}</strong>
                <small>{modality.description}</small>
              </div>
            ))}
          </footer>
        </section>
      </section>
    </main>
  );
}
