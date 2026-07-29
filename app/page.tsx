import type { CSSProperties } from "react";
import Link from "next/link";

import { SiteFooter } from "@/components/shell";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { getUserAccess } from "@/lib/data/access";
import { getDashboardData } from "@/lib/data/dashboard";
import { getCurrentSession } from "@/lib/session";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

async function getHomeData() {
  const session = await getCurrentSession();

  if (!session) {
    return {
      session: null,
      dashboard: null,
      progress: [
        { label: "Questões respondidas", value: "—", width: 0 },
        { label: "Respostas corretas", value: "—", width: 0 },
        { label: "Simulados concluídos", value: "—", width: 0 },
      ],
      progressTitle: "ENTRE PARA VER SEU DESEMPENHO",
    };
  }

  const access = await getUserAccess(session.user.id);
  const dashboard = await getDashboardData(
    session.user.id,
    access.hasFullAccess,
  );
  const basicProgress = [
    {
      label: "Questões respondidas",
      value: String(dashboard.summary.answeredQuestions),
      width: dashboard.summary.answeredQuestions > 0 ? 100 : 0,
    },
    {
      label: "Respostas corretas",
      value: String(dashboard.summary.correctAnswers),
      width: dashboard.summary.accuracy,
    },
    {
      label: "Simulados concluídos",
      value: String(dashboard.summary.completedAttempts),
      width:
        dashboard.summary.attempts > 0
          ? Math.round(
              (dashboard.summary.completedAttempts /
                dashboard.summary.attempts) *
                100,
            )
          : 0,
    },
  ];
  const subjectProgress = dashboard.subjectPerformance
    .slice(0, 3)
    .map((subject) => ({
        label: subject.subject,
        value: `${subject.accuracy}%`,
        width: subject.accuracy,
      }));
  const hasSubjectProgress =
    access.hasFullAccess && subjectProgress.length > 0;
  const progress = hasSubjectProgress ? subjectProgress : basicProgress;

  return {
    session,
    dashboard,
    progress,
    progressTitle: hasSubjectProgress
      ? "DESEMPENHO POR MATÉRIA"
      : "RESUMO DA SUA ATIVIDADE",
  };
}

export default async function HomePage() {
  const home = await getHomeData();
  const firstName =
    home.session?.user.name.trim().split(/\s+/)[0] || "estudante";
  const summary = home.dashboard?.summary;
  const latestAttempt = home.dashboard?.recentAttempts[0] ?? null;
  const activeAttempt =
    home.dashboard?.recentAttempts.find(
      (attempt) => attempt.status === "IN_PROGRESS",
    ) ?? null;
  const completedAttempt =
    home.dashboard?.recentAttempts.find(
      (attempt) => attempt.status === "SUBMITTED",
    ) ?? null;
  const hasAnswers = Boolean(summary?.scoredQuestions);
  const accuracy = summary?.accuracy ?? 0;
  const destination = home.session ? "/painel" : "/entrar";

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
            <Link className={styles.primaryAction} href={destination}>
              {home.session ? "Ir para meu painel" : "Fazer simulado gratuito"}{" "}
              <span aria-hidden="true">→</span>
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
                <strong>
                  {home.session ? `Olá, ${firstName}` : "Visão geral"}
                </strong>
              </div>
              <b>{home.session ? "Sincronizado" : "Prévia"}</b>
            </header>

            <div className={styles.summary}>
              <div
                className={styles.score}
                style={{ "--score": `${accuracy}%` } as CSSProperties}
              >
                <strong>{home.session && hasAnswers ? `${accuracy}%` : "—"}</strong>
                <span>de acertos</span>
              </div>
              <div className={styles.summaryCopy}>
                <span>
                  {latestAttempt ? "ÚLTIMO SIMULADO" : "SEU PROGRESSO"}
                </span>
                <strong>
                  {!home.session
                    ? "Entre para acompanhar"
                    : latestAttempt?.status === "SUBMITTED"
                      ? `${latestAttempt.correctAnswers ?? 0} de ${latestAttempt.totalQuestions} questões`
                      : latestAttempt?.status === "IN_PROGRESS"
                        ? "Tentativa em andamento"
                        : latestAttempt
                          ? "Tentativa encerrada"
                        : "Nenhum simulado iniciado"}
                </strong>
                <small>
                  {latestAttempt
                    ? latestAttempt.title
                    : home.session
                      ? "Comece seu primeiro diagnóstico."
                      : "Seus resultados aparecem aqui após o login."}
                </small>
              </div>
            </div>

            <div className={styles.subjects}>
              <span className={styles.listTitle}>{home.progressTitle}</span>
              {home.progress.map((item) => (
                <div className={styles.subjectRow} key={item.label}>
                  <span>{item.label}</span>
                  <i><b style={{ width: `${item.width}%` }} /></i>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.questionCard}>
            <div className={styles.questionNumber}>
              {activeAttempt ? "↻" : completedAttempt ? "✓" : "01"}
            </div>
            <div>
              <span>
                {activeAttempt
                  ? activeAttempt.pausedAt
                    ? "SIMULADO EM PAUSA"
                    : "SIMULADO EM ANDAMENTO"
                  : completedAttempt
                    ? "ÚLTIMO RESULTADO"
                    : "PRONTO PARA COMEÇAR"}
              </span>
              <strong>
                {activeAttempt?.title ??
                  completedAttempt?.title ??
                  "Seu primeiro simulado"}
              </strong>
              <small>
                {activeAttempt
                  ? `Progresso salvo · ${activeAttempt.totalQuestions} questões`
                  : completedAttempt
                    ? `${completedAttempt.correctAnswers ?? 0} acertos em ${completedAttempt.totalQuestions}`
                    : home.session
                      ? "Escolha uma prova e comece agora"
                      : "Entre para salvar seu progresso"}
              </small>
            </div>
            <Link
              href={
                activeAttempt
                  ? `/simulados/${activeAttempt.id}`
                  : completedAttempt
                    ? `/simulados/${completedAttempt.id}/resultado`
                    : home.session
                      ? "/simulados"
                      : "/entrar"
              }
              aria-label={
                activeAttempt ? "Continuar simulado" : "Abrir área de simulados"
              }
            >
              →
            </Link>
          </section>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
