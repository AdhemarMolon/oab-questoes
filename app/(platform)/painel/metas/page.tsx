import type { Metadata } from "next";

import { EmptyPanel, PanelPageHeader, ProgressBar, StatCard } from "@/components/panel";
import { getGoalsData } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import { deleteGoalAction, saveGoalAction } from "../actions";
import styles from "../study.module.css";

export const metadata: Metadata = { title: "Metas" };

const metrics = [["QUESTIONS", "Questões"], ["STUDY_MINUTES", "Minutos de estudo planejado"], ["SIMULATIONS", "Simulados"], ["ACCURACY", "Aproveitamento (%)"], ["SIMULATION_SCORE", "Pontos em simulados"]] as const;
const periods = [["DAILY", "Diária"], ["WEEKLY", "Semanal"], ["MONTHLY", "Mensal"], ["UNTIL_DATE", "Objetivo geral"]] as const;

function GoalForm({ goal }: { goal?: Awaited<ReturnType<typeof getGoalsData>>[number] }) {
  return <form action={saveGoalAction} className={styles.form}>
    <input name="id" type="hidden" value={goal?.id ?? ""}/>
    <label className={styles.full}>Nome da meta<input defaultValue={goal?.title ?? ""} maxLength={180} name="title" placeholder="Ex.: Questões da semana" required/></label>
    <label>Métrica<select defaultValue={goal?.metric ?? "QUESTIONS"} name="metric">{metrics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Período<select defaultValue={goal?.period ?? "WEEKLY"} name="period">{periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Valor desejado<input defaultValue={goal?.targetValue ?? 200} min={1} name="targetValue" required type="number"/></label>
    <div className={styles.formActions}><button className={styles.button} type="submit">{goal ? "Salvar alterações" : "Criar meta"}</button></div>
  </form>;
}

export default async function GoalsPage() {
  const session = await requireUser();
  const goals = await getGoalsData(session.user.id);
  const average = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0;
  return <main className={styles.page} id="main-content">
    <PanelPageHeader eyebrow="OBJETIVOS PESSOAIS" title="Metas" description="Transforme sua preparação em objetivos claros e acompanhe cada avanço."/>
    <section className={styles.stats}>
      <StatCard label="Metas ativas" tone="brand" value={goals.filter((goal) => goal.isActive).length} detail="Objetivos acompanhados"/>
      <StatCard label="Progresso médio" value={`${average}%`} detail={<ProgressBar value={average}/>}/>
      <StatCard label="Concluídas" value={goals.filter((goal) => goal.progress >= 100).length} detail="Metas atingidas"/>
      <StatCard label="Em andamento" tone="gold" value={goals.filter((goal) => goal.progress < 100).length} detail="Continue no ritmo"/>
    </section>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>NOVA META</p><h2>Defina seu próximo objetivo</h2></div></div><GoalForm/></section>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>ACOMPANHAMENTO</p><h2>Suas metas</h2></div></div>{goals.length ? <div className={styles.grid2}>{goals.map((goal) => <article className={`${styles.listItem} ${styles.goal}`} key={goal.id}><header><div><h3>{goal.title}</h3><div className={styles.meta}><span>{periods.find(([value]) => value === goal.period)?.[1]}</span><span>{metrics.find(([value]) => value === goal.metric)?.[1]}</span></div></div><strong>{goal.progress}%</strong></header><div className={styles.goalNumbers}><strong>{goal.current} / {goal.targetValue}</strong><span>{goal.progress >= 100 ? "Concluído" : `${goal.progress}% concluído`}</span></div><ProgressBar value={goal.progress}/><div className={styles.itemActions}><details className={styles.details}><summary>Editar</summary><GoalForm goal={goal}/></details><form action={deleteGoalAction}><input name="id" type="hidden" value={goal.id}/><button className={styles.textButton} type="submit">Excluir</button></form></div></article>)}</div> : <EmptyPanel title="Nenhuma meta cadastrada">Crie uma meta acima para começar seu acompanhamento.</EmptyPanel>}</section>
  </main>;
}
