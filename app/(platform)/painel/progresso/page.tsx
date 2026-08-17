import type { Metadata } from "next";

import { MiniBars, PanelPageHeader, StatCard, TrendChart } from "@/components/panel";
import { getStudyAnalytics } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import styles from "../study.module.css";

export const metadata: Metadata = { title: "Meu Progresso" };

function duration(seconds: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

export default async function ProgressPage() {
  const session = await requireUser();
  const data = await getStudyAnalytics(session.user.id);
  const best = data.subjectPerformance.slice().sort((a, b) => b.accuracy - a.accuracy)[0];
  const worst = data.subjectPerformance.slice().sort((a, b) => a.accuracy - b.accuracy)[0];
  return <main className={styles.page} id="main-content">
    <PanelPageHeader eyebrow="EVOLUÇÃO" title="Meu Progresso" description="Acompanhe sua constância e a evolução construída com respostas e simulados reais."/>
    <section className={styles.stats} aria-label="Resumo do progresso">
      <StatCard detail={`${data.summary.correct} acertos de ${data.summary.scored} corrigidas`} label="Aproveitamento geral" tone="brand" value={`${data.summary.accuracy}%`}/>
      <StatCard detail={`${data.summary.incorrect} erros`} label="Questões respondidas" value={data.summary.answered}/>
      <StatCard detail={`Média de ${data.summary.averageSimulationScore} pontos`} label="Simulados realizados" value={data.summary.completedSimulations}/>
      <StatCard detail="Dias consecutivos com respostas" label="Sequência de estudos" tone="gold" value={`${data.summary.streak} dias`}/>
    </section>
    <div className={styles.gridWide}>
      <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>ÚLTIMOS 14 DIAS</p><h2>Evolução diária</h2></div><p>Sem resposta = 0%</p></div><TrendChart items={data.daily.map((day) => ({ label: day.label, value: day.accuracy }))}/></section>
      <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>RITMO ATUAL</p><h2>Recortes recentes</h2></div></div><MiniBars items={[
        { label: "Hoje", value: data.daily.at(-1)?.accuracy ?? 0, detail: `${data.daily.at(-1)?.total ?? 0} questões` },
        { label: "Esta semana", value: data.weekly.accuracy, detail: `${data.weekly.accuracy}%` },
        { label: "Este mês", value: data.monthly.accuracy, detail: `${data.monthly.accuracy}%` },
      ]}/></section>
    </div>
    <div className={styles.grid2}>
      <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>DISCIPLINAS</p><h2>Desempenho por matéria</h2></div></div>{data.subjectPerformance.length ? <MiniBars items={data.subjectPerformance.map((subject) => ({ label: subject.subject, value: subject.accuracy, detail: `${subject.correct}/${subject.total}` }))}/> : <p className={styles.notice}>Responda questões para formar esta análise.</p>}</section>
      <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>DIAGNÓSTICO</p><h2>Pontos de atenção</h2></div></div><div className={styles.list}>
        <div className={styles.listItem}><h3>Melhor desempenho</h3><p>{best ? `${best.subject} · ${best.accuracy}% de acertos` : "Ainda sem dados suficientes."}</p></div>
        <div className={styles.listItem}><h3>Maior oportunidade</h3><p>{worst ? `${worst.subject} · ${worst.accuracy}% de acertos` : "Ainda sem dados suficientes."}</p></div>
        <div className={styles.listItem}><h3>Tempo médio por questão</h3><p>{duration(data.summary.averageQuestionSeconds)} · calculado pelo tempo total dos simulados concluídos.</p></div>
      </div><p className={styles.notice}>O banco atual classifica por disciplina, mas ainda não possui taxonomia de assuntos. Por isso, nenhum “desempenho por assunto” artificial é exibido.</p></section>
    </div>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>HISTÓRICO</p><h2>Notas dos simulados</h2></div></div>{data.simulationHistory.length ? <TrendChart items={data.simulationHistory.slice(-12).map((attempt) => ({ label: `${attempt.score}/${attempt.total}`, value: attempt.accuracy }))}/> : <p className={styles.notice}>Conclua um simulado para iniciar seu histórico de notas.</p>}</section>
  </main>;
}
