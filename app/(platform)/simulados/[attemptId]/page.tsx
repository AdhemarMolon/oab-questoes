import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SimulationRunner } from "@/components/study";
import { getAttemptForRunner } from "@/lib/data/simulations";
import { requireUser } from "@/lib/session";

import { answerSimulationQuestion, finishSimulationAttempt } from "../actions";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Resolver simulado" };

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const [{ attemptId }, session] = await Promise.all([params, requireUser()]);
  const data = await getAttemptForRunner(session.user.id, attemptId);

  if (!data) notFound();
  if (data.attempt.status === "SUBMITTED") redirect(`/simulados/${attemptId}/resultado`);

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
        questions={data.questions}
      />
    </main>
  );
}
