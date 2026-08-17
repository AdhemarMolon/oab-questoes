import type { Metadata } from "next";
import Link from "next/link";

import { PanelPageHeader, ProgressBar, StatCard } from "@/components/panel";
import { getPlannerData, listStudySubjects } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import { deleteActivityAction, saveActivityAction, toggleActivityAction } from "../actions";
import styles from "../study.module.css";

export const metadata: Metadata = { title: "Planejamento" };

const types = [
  ["QUESTIONS", "Resolver questões"], ["THEORY", "Estudo teórico"], ["REVIEW", "Revisão"],
  ["SIMULATION", "Simulado"], ["TIME", "Tempo de estudo"], ["CUSTOM", "Outra atividade"],
] as const;

function localInput(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replace(" ", "T");
}

function ActivityForm({ subjects, activity }: { subjects: Awaited<ReturnType<typeof listStudySubjects>>; activity?: Awaited<ReturnType<typeof getPlannerData>>["days"][number]["activities"][number] }) {
  return <form action={saveActivityAction} className={styles.form}>
    <input name="id" type="hidden" value={activity?.id ?? ""}/>
    <label>Título<input defaultValue={activity?.title ?? ""} maxLength={180} name="title" placeholder="Ex.: Revisar Direito Penal" required/></label>
    <label>Tipo<select defaultValue={activity?.type ?? "QUESTIONS"} name="type">{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Dia e horário<input defaultValue={activity ? localInput(activity.scheduledAt) : ""} name="scheduledAt" required type="datetime-local"/></label>
    <label>Disciplina<select defaultValue={activity?.subjectId ?? ""} name="subjectId"><option value="">Geral / sem disciplina</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
    <label>Duração estimada (min)<input defaultValue={activity?.estimatedMinutes ?? ""} min={1} name="estimatedMinutes" type="number"/></label>
    <label>Quantidade de questões<input defaultValue={activity?.targetQuestions ?? ""} min={1} name="targetQuestions" type="number"/></label>
    <label className={styles.full}>Observações<textarea defaultValue={activity?.description ?? ""} maxLength={1000} name="description" placeholder="Detalhes opcionais"/></label>
    <div className={styles.formActions}><button className={styles.button} type="submit">{activity ? "Salvar alterações" : "Criar atividade"}</button></div>
  </form>;
}

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ semana?: string; editar?: string }> }) {
  const [session, params] = await Promise.all([requireUser(), searchParams]);
  const [planner, subjects] = await Promise.all([getPlannerData(session.user.id, params.semana), listStudySubjects()]);
  const editing = planner.days.flatMap((day) => day.activities).find((activity) => activity.id === params.editar);
  return <main className={styles.page} id="main-content">
    <PanelPageHeader eyebrow="ORGANIZAÇÃO" title="Planejamento" description="Monte sua semana, defina horário e acompanhe o que já foi concluído."/>
    <section className={styles.stats}>
      <StatCard label="Atividades na semana" tone="brand" value={planner.total} detail={`${planner.pending} pendentes`}/>
      <StatCard label="Concluídas" value={planner.completed} detail="Atividades finalizadas"/>
      <StatCard label="Conclusão semanal" value={`${planner.completion}%`} detail={<ProgressBar value={planner.completion}/>}/>
      <StatCard label="Semana" tone="gold" value={new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${planner.weekStart}T12:00:00-03:00`))} detail="Segunda a domingo"/>
    </section>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>{editing ? "EDITAR ATIVIDADE" : "NOVA ATIVIDADE"}</p><h2>{editing ? editing.title : "O que você quer realizar?"}</h2></div>{editing ? <Link className={styles.textButton} href={`/painel/planejamento?semana=${planner.weekStart}`}>Cancelar edição</Link> : null}</div><ActivityForm activity={editing} subjects={subjects}/></section>
    <section className={styles.panel} style={{ marginTop: 14 }}>
      <div className={styles.calendarNav}><Link href={`/painel/planejamento?semana=${planner.previousWeek}`}>← Semana anterior</Link><strong>Planner semanal</strong><Link href={`/painel/planejamento?semana=${planner.nextWeek}`}>Próxima semana →</Link></div>
      <div className={styles.dayGrid}>{planner.days.map((day) => <section className={styles.day} key={day.key}><header><strong>{day.label}</strong><span>{day.activities.length}</span></header>{day.activities.map((activity) => <article className={`${styles.activity} ${activity.completedAt ? styles.done : ""}`} key={activity.id}><strong>{activity.title}</strong><span>{localInput(activity.scheduledAt).slice(11)} · {activity.subject ?? "Geral"}</span><div className={styles.itemActions}>
          <form action={toggleActivityAction}><input name="id" type="hidden" value={activity.id}/><input name="completed" type="hidden" value={String(Boolean(activity.completedAt))}/><button className={styles.textButton} type="submit">{activity.completedAt ? "Reabrir" : "Concluir"}</button></form>
          <Link className={styles.textButton} href={`/painel/planejamento?semana=${planner.weekStart}&editar=${activity.id}`}>Editar</Link>
          <form action={deleteActivityAction}><input name="id" type="hidden" value={activity.id}/><button className={styles.textButton} type="submit">Excluir</button></form>
        </div></article>)}</section>)}</div>
    </section>
  </main>;
}
