import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui";
import { getUserAccess } from "@/lib/data/access";
import { getDashboardData } from "@/lib/data/dashboard";
import { listAvailableSimulations } from "@/lib/data/simulations";
import { requireUser } from "@/lib/session";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "Meu painel" };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function DashboardPage() {
  const session = await requireUser();
  const access = await getUserAccess(session.user.id);
  const [dashboard, catalog] = await Promise.all([
    getDashboardData(session.user.id, access.hasFullAccess),
    listAvailableSimulations(session.user.id, access),
  ]);

  const firstName = session.user.name.trim().split(/\s+/)[0] || "estudante";

  return (
    <main className={styles.page} id="main-content">
      <header className={styles.intro}>
        <div>
          <p>SEU CADERNO DE ESTUDOS</p>
          <h1>Olá, {firstName}.</h1>
          <span>Seu progresso está salvo e pronto para continuar.</span>
        </div>
        <Badge variant={access.hasFullAccess ? "premium" : "neutral"} withDot>
          {access.hasFullAccess ? `Plano ${access.effectivePlan.toLowerCase()}` : "Acesso gratuito"}
        </Badge>
      </header>

      <section className={styles.metrics} aria-label="Estatísticas básicas">
        <article className={styles.primaryMetric}>
          <span>APROVEITAMENTO</span>
          <strong>{dashboard.summary.accuracy}%</strong>
          <p>{dashboard.summary.correctAnswers} acertos em {dashboard.summary.answeredQuestions} respostas</p>
          <i><b style={{ width: `${dashboard.summary.accuracy}%` }} /></i>
        </article>
        <article>
          <span>QUESTÕES RESPONDIDAS</span>
          <strong>{dashboard.summary.answeredQuestions}</strong>
          <p>Somadas em todas as tentativas.</p>
        </article>
        <article>
          <span>SIMULADOS CONCLUÍDOS</span>
          <strong>{dashboard.summary.completedAttempts}</strong>
          <p>{dashboard.summary.attempts} tentativa(s) iniciada(s).</p>
        </article>
      </section>

      <div className={styles.columns}>
        <section className={styles.recent}>
          <div className={styles.sectionHeader}>
            <div><span>ATIVIDADE RECENTE</span><h2>Seus simulados</h2></div>
            <Link href="/simulados">Ver todos →</Link>
          </div>

          {dashboard.recentAttempts.length ? (
            <div className={styles.attemptList}>
              {dashboard.recentAttempts.map((attempt) => (
                <Link
                  href={`/simulados/${attempt.id}${attempt.status === "SUBMITTED" ? "/resultado" : ""}`}
                  key={attempt.id}
                >
                  <div>
                    <strong>{attempt.title}</strong>
                    <span>{dateFormatter.format(attempt.startedAt)}</span>
                  </div>
                  <Badge variant={attempt.status === "SUBMITTED" ? "success" : "warning"}>
                    {attempt.status === "SUBMITTED" ? "Concluído" : "Em andamento"}
                  </Badge>
                  <b aria-hidden="true">→</b>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.noAttempts}>
              <strong>Seu primeiro resultado começa aqui.</strong>
              <p>Inicie o simulado gratuito para criar seu diagnóstico.</p>
              <Link href="/simulados">Escolher simulado →</Link>
            </div>
          )}
        </section>

        <aside className={styles.accessCard}>
          <span>{access.hasFullAccess ? "ACESSO COMPLETO" : "SEU ACESSO"}</span>
          <h2>{access.hasFullAccess ? "Toda a plataforma liberada" : catalog.freeAttempt ? "Benefício gratuito utilizado" : "1 simulado disponível"}</h2>
          <p>
            {access.hasFullAccess
              ? "Crie novas tentativas e use as estatísticas detalhadas sem limite."
              : catalog.freeAttempt
                ? "Sua tentativa continua disponível para revisão. O plano completo libera novos simulados."
                : "Faça um simulado completo e acompanhe as estatísticas básicas sem pagar."}
          </p>
          <Link href={access.hasFullAccess ? "/simulados" : "/planos"}>
            {access.hasFullAccess ? "Ir para simulados →" : "Conhecer acesso completo →"}
          </Link>
        </aside>
      </div>

      <section className={styles.subjectSection}>
        <div className={styles.sectionHeader}>
          <div><span>ANÁLISE POR DISCIPLINA</span><h2>Onde concentrar seu estudo</h2></div>
        </div>

        {access.hasFullAccess ? (
          dashboard.subjectPerformance.length ? (
            <div className={styles.subjectGrid}>
              {dashboard.subjectPerformance.map((subject) => (
                <article key={subject.subject}>
                  <strong>{subject.subject}</strong>
                  <span>{subject.answered} respondidas · {subject.correct} acertos</span>
                  <i><b style={{ width: `${subject.accuracy}%` }} /></i>
                  <em>{subject.accuracy}%</em>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.emptyAdvanced}>Responda questões para formar sua análise por disciplina.</p>
          )
        ) : (
          <div className={styles.paywall}>
            <div><span>RECURSO DO ACESSO COMPLETO</span><h3>Veja seu desempenho matéria por matéria.</h3></div>
            <p>As estatísticas básicas continuam disponíveis acima. A análise detalhada é liberada nos planos mensal, anual e vitalício.</p>
            <Link href="/planos">Ver modalidades →</Link>
          </div>
        )}
      </section>
    </main>
  );
}
