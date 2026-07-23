import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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

  return (
    <main className={styles.page} id="main-content">
      <section className={styles.sheet}>
        <p>RESULTADO DO SIMULADO</p>
        <h1>{result.title}</h1>
        <div className={styles.score}>
          <strong>{result.accuracy}%</strong>
          <span>de aproveitamento</span>
        </div>
        <div className={styles.metrics}>
          <div><strong>{result.answered}</strong><span>respondidas</span></div>
          <div><strong>{result.correct}</strong><span>corretas</span></div>
          <div><strong>{Math.max(0, result.answered - result.correct)}</strong><span>incorretas</span></div>
        </div>
        {result.status !== "SUBMITTED" && (
          <div className={styles.warning}>Esta tentativa ainda não foi finalizada.</div>
        )}
        <div className={styles.actions}>
          <Link href="/simulados">Ver simulados</Link>
          <Link href="/painel">Ir para meu painel →</Link>
        </div>
      </section>
    </main>
  );
}
