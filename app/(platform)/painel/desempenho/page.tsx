import type { Metadata } from "next";
import Link from "next/link";

import { MiniBars, PanelPageHeader, StatCard, TrendChart } from "@/components/panel";
import { getStudyAnalytics } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import styles from "../study.module.css";

export const metadata: Metadata = { title: "Meu Desempenho" };

function domain(accuracy: number) {
  if (accuracy >= 80) return { label: "Dominado", className: styles.mastered };
  if (accuracy >= 70) return { label: "Bom desempenho", className: styles.good };
  if (accuracy >= 50) return { label: "Atenção", className: styles.attention };
  return { label: "Precisa revisar", className: styles.review };
}

export default async function PerformancePage() {
  const session = await requireUser();
  const data = await getStudyAnalytics(session.user.id);
  const weekDelta = data.weekly.accuracy - data.previousWeek.accuracy;
  return <main className={styles.page} id="main-content">
    <PanelPageHeader eyebrow="ANÁLISE" title="Meu Desempenho" description="Leitura analítica do seu histórico, com mapa de domínio e relatório consolidado de simulados."/>
    <section className={styles.stats}>
      <StatCard label="Aproveitamento" tone="brand" value={`${data.summary.accuracy}%`} detail={`${data.summary.correct} acertos · ${data.summary.incorrect} erros`}/>
      <StatCard label="Total realizado" value={data.summary.answered} detail="Questões respondidas"/>
      <StatCard label="Comparação semanal" value={`${weekDelta >= 0 ? "+" : ""}${weekDelta} p.p.`} detail={`${data.weekly.accuracy}% nesta semana`}/>
      <StatCard label="Sequência atual" tone="gold" value={`${data.summary.streak} dias`} detail={`${data.summary.studyDays} dias com atividade no histórico`}/>
    </section>
    <div className={styles.grid2}>
      <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>ACERTOS E ERROS</p><h2>Distribuição geral</h2></div></div><MiniBars items={[{ label: "Acertos", value: data.summary.accuracy, detail: String(data.summary.correct) }, { label: "Erros", value: 100 - data.summary.accuracy, detail: String(data.summary.incorrect) }]}/></section>
      <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>EVOLUÇÃO</p><h2>Últimos simulados</h2></div></div>{data.simulationHistory.length ? <TrendChart items={data.simulationHistory.slice(-8).map((item) => ({ label: String(item.score), value: item.accuracy }))}/> : <p className={styles.notice}>Seu gráfico aparecerá após o primeiro simulado concluído.</p>}</section>
    </div>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>MAPA DE DOMÍNIO</p><h2>Domínio das disciplinas</h2></div></div>{data.subjectPerformance.length ? <div className={styles.domain}>{data.subjectPerformance.map((subject) => { const rank = domain(subject.accuracy); return <article key={subject.id}><span>{subject.subject} · {subject.accuracy}%</span><strong className={rank.className}>{rank.label}</strong></article>; })}</div> : <p className={styles.notice}>Responda questões para classificar seu domínio.</p>}</section>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>RELATÓRIO DE SIMULADOS</p><h2>Tentativas concluídas</h2></div><p>Média: {data.summary.averageSimulationScore} pontos</p></div>{data.simulationHistory.length ? <div className={styles.list}>{data.simulationHistory.slice().reverse().map((attempt, index, all) => {
      const previous = all[index + 1];
      const weakest = attempt.subjects[0];
      return <article className={styles.listItem} key={attempt.id}><header><div><h3>{attempt.title}</h3><p>{attempt.score} acertos · {attempt.incorrect} erros · {attempt.accuracy}% · {attempt.durationMinutes} min · média de {attempt.averageQuestionSeconds}s por questão</p></div><strong>{previous ? `${attempt.score - previous.score >= 0 ? "+" : ""}${attempt.score - previous.score} pts` : "Base"}</strong></header>{weakest ? <p className={styles.notice}>Recomendação: priorize {weakest.subject}, com {weakest.incorrect} erro(s) e {weakest.accuracy}% de aproveitamento nesta tentativa.</p> : null}<details className={styles.details}><summary>Desempenho por disciplina</summary><div style={{ marginTop: 14 }}><MiniBars items={attempt.subjects.map((subject) => ({ label: subject.subject, value: subject.accuracy, detail: `${subject.correct}/${subject.total}` }))}/></div></details><div className={styles.itemActions}><Link className={styles.secondaryButton} href={`/simulados/${attempt.id}/resultado`}>Abrir resultado</Link><Link className={styles.textButton} href="/painel/hoje">Ver recomendações</Link></div></article>;
    })}</div> : <p className={styles.notice}>Conclua um simulado para receber comparações e recomendações.</p>}<p className={styles.notice}>O tempo total é real. O tempo por questão e as questões mais demoradas ainda não podem ser medidos com precisão porque a resolução atual não registra a entrada e saída de cada questão.</p></section>
  </main>;
}
