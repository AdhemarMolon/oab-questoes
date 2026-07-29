import Link from "next/link";

import { SiteFooter } from "@/components/shell";
import { SiteHeader } from "@/components/shell/SiteHeader";

import styles from "./page.module.css";

const progress = [
  ["Ética Profissional", "82%"],
  ["Direito Constitucional", "71%"],
  ["Direito Civil", "59%"],
] as const;

export default function HomePage() {
  return (
    <main className={styles.page} id="main-content">
      <SiteHeader />

      <section className={styles.hero}>
        <div className={styles.marginNote} aria-hidden="true">
          PREPARAÇÃO PARA A 1ª FASE <i /> FOCO NO QUE IMPORTA
        </div>

        <div className={styles.copy}>
          <p className={styles.eyebrow}>QUESTÕES · SIMULADOS · DESEMPENHO</p>
          <h1>
            Estude com método. Avance com <em>clareza.</em>
          </h1>
          <p className={styles.lead}>
            Uma plataforma para resolver questões, acompanhar sua evolução e descobrir onde concentrar a próxima hora de estudo.
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/entrar">
              Fazer simulado gratuito <span aria-hidden="true">→</span>
            </Link>
            <Link className={styles.secondaryAction} href="/como-funciona">
              Conhecer a plataforma
            </Link>
          </div>

          <div className={styles.quickFacts}>
            <div><strong>1</strong><span>simulado<br />gratuito</span></div>
            <i />
            <div><strong>400</strong><span>questões no<br />acervo inicial</span></div>
            <i />
            <div><strong>20</strong><span>disciplinas<br />organizadas</span></div>
          </div>
        </div>

        <div className={styles.visual} aria-label="Prévia da área de estudos">
          <div className={styles.backSheet} />
          <section className={styles.dashboardCard}>
            <header>
              <div>
                <span>SEU PAINEL</span>
                <strong>Visão geral</strong>
              </div>
              <b>Sincronizado</b>
            </header>

            <div className={styles.summary}>
              <div className={styles.score}>
                <strong>68%</strong>
                <span>de acertos</span>
              </div>
              <div className={styles.summaryCopy}>
                <span>ÚLTIMO SIMULADO</span>
                <strong>54 de 80 questões</strong>
                <small>Continue de onde parou, em qualquer dispositivo.</small>
              </div>
            </div>

            <div className={styles.subjects}>
              <span className={styles.listTitle}>DESEMPENHO POR MATÉRIA</span>
              {progress.map(([subject, value]) => (
                <div className={styles.subjectRow} key={subject}>
                  <span>{subject}</span>
                  <i><b style={{ width: value }} /></i>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.questionCard}>
            <div className={styles.questionNumber}>23</div>
            <div>
              <span>SIMULADO EM ANDAMENTO</span>
              <strong>Direito Constitucional</strong>
              <small>Questão 23 de 80</small>
            </div>
            <Link href="/entrar" aria-label="Continuar simulado">→</Link>
          </section>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
