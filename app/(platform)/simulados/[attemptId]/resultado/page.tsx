import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAttemptResult } from "@/lib/data/simulations";
import { requireUser } from "@/lib/session";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "Resultado do simulado" };

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const [{ attemptId }, session] = await Promise.all([params, requireUser()]);
  const result = await getAttemptResult(session.user.id, attemptId);
  if (!result) notFound();
  if (result.status !== "SUBMITTED") redirect(`/simulados/${attemptId}`);

  const scoredQuestions = result.correct + result.incorrect;
  const correctPercentage = scoredQuestions > 0 ? result.accuracy : 0;
  const incorrectPercentage = scoredQuestions > 0 ? 100 - correctPercentage : 0;
  const chartStyle = {
    "--correct-percentage": `${correctPercentage}%`,
  } as CSSProperties;

  return (
    <main className={styles.page} id="main-content">
      <section className={styles.sheet}>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>RESULTADO DO SIMULADO</p>
            <h1>{result.title}</h1>
            <p className={styles.description}>
              Confira seu desempenho nesta tentativa e use o resultado para orientar
              seus próximos estudos.
            </p>
          </div>

          <div className={styles.scoreOverview}>
            <div
              className={styles.score}
              style={chartStyle}
              role="img"
              aria-label={
                scoredQuestions > 0
                  ? `${correctPercentage}% de acertos e ${incorrectPercentage}% de erros`
                  : "Nenhuma questão corrigida nesta tentativa"
              }
            >
              <div className={styles.scoreInner}>
                <strong>{result.accuracy}%</strong>
              </div>
            </div>

            <div className={styles.legend} aria-hidden="true">
              <span>
                <i className={styles.correctDot} />
                Acertos <strong>{correctPercentage}%</strong>
              </span>
              <span>
                <i className={styles.incorrectDot} />
                Erros <strong>{incorrectPercentage}%</strong>
              </span>
            </div>
          </div>
        </header>

        <div className={styles.metrics}>
          <div>
            <strong>{result.answered}</strong>
            <span>respondidas</span>
          </div>
          <div>
            <strong>{result.correct}</strong>
            <span>corretas</span>
          </div>
          <div>
            <strong>{result.incorrect}</strong>
            <span>incorretas</span>
          </div>
          <div>
            <strong>{result.annulled}</strong>
            <span>anuladas</span>
          </div>
          <div>
            <strong>{result.skipped}</strong>
            <span>puladas</span>
          </div>
        </div>

        <p className={styles.scoreNote}>
          O gráfico compara apenas as questões corrigidas. Questões puladas e anuladas
          ficam fora do cálculo de aproveitamento.
        </p>

        <div className={styles.actions}>
          <Link href="/simulados">Ver simulados</Link>
          <Link href="/painel">Ir para meu painel <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
