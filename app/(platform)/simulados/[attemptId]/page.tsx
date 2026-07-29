import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SimulationRunner } from "@/components/study";
import {
  finalizeSimulationAttemptForUser,
  getAttemptForRunner,
} from "@/lib/data/simulations";
import { requireUser } from "@/lib/session";
import { getSimulationClock } from "@/lib/simulation-attempt";

import {
  answerSimulationQuestion,
  finishSimulationAttempt,
  pauseSimulationAttempt,
  resumeSimulationAttemptAction,
  skipSimulationQuestion,
} from "../actions";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Resolver simulado" };

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const [{ attemptId }, session] = await Promise.all([params, requireUser()]);
  const data = await getAttemptForRunner(session.user.id, attemptId);

  if (!data) notFound();
  if (data.attempt.status === "SUBMITTED") redirect(`/simulados/${attemptId}/resultado`);
  if (data.attempt.pausedAt) {
    return (
      <main className={styles.page} id="main-content">
        <div className={styles.topline}>
          <Link href="/simulados">← Voltar aos simulados</Link>
          <span>{data.attempt.title}</span>
        </div>
        <section className={styles.paused}>
          <p>SIMULADO PAUSADO</p>
          <h1>Seu tempo está congelado.</h1>
          <span>
            As respostas confirmadas estão salvas. Retome quando estiver pronto
            para continuar do mesmo ponto.
          </span>
          <form action={resumeSimulationAttemptAction}>
            <input name="attemptId" type="hidden" value={attemptId} />
            <button type="submit">Retomar simulado →</button>
          </form>
        </section>
      </main>
    );
  }
  const initialClock = getSimulationClock({
    startedAt: data.attempt.startedAt,
    expiresAt: data.attempt.expiresAt,
  });
  if (initialClock.expired) {
    const finalization = await finalizeSimulationAttemptForUser({
      userId: session.user.id,
      attemptId,
    });
    if (finalization.ok) {
      redirect(`/simulados/${attemptId}/resultado`);
    }
  }

  return (
    <main className={styles.page} id="main-content">
      <div className={styles.topline}>
        <Link href="/simulados">← Voltar aos simulados</Link>
        <span>{data.attempt.title}</span>
      </div>
      <SimulationRunner
        answerAction={answerSimulationQuestion}
        attemptId={attemptId}
        finishAction={finishSimulationAttempt}
        hasTimeLimit={Boolean(data.attempt.expiresAt)}
        initialTimeSeconds={initialClock.seconds}
        pauseAction={pauseSimulationAttempt}
        questions={data.questions}
        skipAction={skipSimulationQuestion}
      />
    </main>
  );
}
