import type { Metadata } from "next";

import { EmptyPanel, PanelPageHeader, StatCard } from "@/components/panel";
import { getStudyPlan, listStudySubjects } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import { saveStudyPlanAction } from "../actions";
import styles from "../study.module.css";

export const metadata: Metadata = { title: "Plano de Estudos" };

const weekdays = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
const kindLabels = { THEORY: "Teoria", QUESTIONS: "Questões", REVIEW: "Revisão", SIMULATION: "Simulado" } as const;

export default async function StudyPlanPage() {
  const session = await requireUser();
  const [plan, subjects] = await Promise.all([getStudyPlan(session.user.id), listStudySubjects()]);
  return <main className={styles.page} id="main-content">
    <PanelPageHeader eyebrow="PREPARAÇÃO ADAPTATIVA" title="Plano de Estudos" description="Informe sua disponibilidade e gere uma semana equilibrada entre teoria, questões, revisões e simulados."/>
    {plan ? <section className={styles.stats}><StatCard label="Dias até a prova" tone="brand" value={plan.daysToExam} detail={new Intl.DateTimeFormat("pt-BR").format(new Date(`${plan.examDate}T12:00:00-03:00`))}/><StatCard label="Dias por semana" value={plan.daysPerWeek} detail="Dias de estudo"/><StatCard label="Carga diária" value={`${Math.round(plan.minutesPerDay / 60 * 10) / 10}h`} detail="Disponibilidade informada"/><StatCard label="Nível atual" tone="gold" value={plan.currentLevel === "INICIANTE" ? "Iniciante" : plan.currentLevel === "INTERMEDIARIO" ? "Intermediário" : "Avançado"} detail="Base do cronograma"/></section> : null}
    <section className={styles.panel} style={{ marginTop: plan ? 14 : 0 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>CONFIGURAÇÃO</p><h2>{plan ? "Atualizar plano" : "Criar meu plano"}</h2></div></div><form action={saveStudyPlanAction} className={styles.form}><label>Data da prova<input defaultValue={plan?.examDate ?? ""} name="examDate" required type="date"/></label><label>Dias disponíveis por semana<input defaultValue={plan?.daysPerWeek ?? 5} max={7} min={1} name="daysPerWeek" required type="number"/></label><label>Horas disponíveis por dia<input defaultValue={plan ? plan.minutesPerDay / 60 : 2} max={12} min={0.25} name="hoursPerDay" required step="0.25" type="number"/></label><label>Nível atual<select defaultValue={plan?.currentLevel ?? "INICIANTE"} name="currentLevel"><option value="INICIANTE">Iniciante</option><option value="INTERMEDIARIO">Intermediário</option><option value="AVANCADO">Avançado</option></select></label><fieldset className={styles.full} style={{ border: 0, padding: 0 }}><legend style={{ marginBottom: 9, color: "#655b53", fontSize: 9, fontWeight: 800 }}>DISCIPLINAS MAIS DIFÍCEIS</legend><div className={styles.domain}>{subjects.map((subject) => <label key={subject.id} style={{ alignItems: "center", display: "flex", gap: 8, minHeight: 38, padding: "7px 10px", border: "1px solid #e2d6c8", background: "white", textTransform: "none" }}><input defaultChecked={plan?.difficultSubjectIds.includes(subject.id)} name="difficultSubjectIds" style={{ width: 15 }} type="checkbox" value={subject.id}/>{subject.name}</label>)}</div></fieldset><div className={styles.formActions}><button className={styles.button} type="submit">{plan ? "Recalcular cronograma" : "Gerar cronograma"}</button></div></form></section>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>CRONOGRAMA SUGERIDO</p><h2>Sua semana de preparação</h2></div></div>{plan ? <div className={styles.grid2}>{plan.schedule.map((day) => <article className={styles.planDay} key={day.weekday}><strong>{weekdays[day.weekday - 1]}</strong>{day.blocks.map((block, index) => <div className={styles.planBlock} key={`${block.kind}-${index}`}><span>{kindLabels[block.kind]}</span><span>{block.subject}</span><span>{block.minutes} min</span></div>)}</article>)}</div> : <EmptyPanel title="Seu cronograma aparecerá aqui">Preencha os dados acima para gerar a primeira versão.</EmptyPanel>}<p className={styles.notice}>O cronograma se adapta a cada acesso: as disciplinas com menor aproveitamento real assumem prioridade nos primeiros blocos, além das dificuldades indicadas por você.</p></section>
  </main>;
}
