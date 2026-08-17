import type { Metadata } from "next";
import Link from "next/link";

import { EmptyPanel, PanelPageHeader, ProgressBar, StatCard } from "@/components/panel";
import { getTodayStudy } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import { toggleTodayTaskAction } from "../actions";
import styles from "../study.module.css";

export const metadata: Metadata = { title: "O que estudar hoje?" };

export default async function TodayPage() {
  const session = await requireUser();
  const data = await getTodayStudy(session.user.id);
  const completed = data.tasks.filter((task) => task.completed).length;
  const progress = data.tasks.length ? Math.round(completed / data.tasks.length * 100) : 0;
  return <main className={styles.page} id="main-content">
    <PanelPageHeader eyebrow="ROTEIRO PERSONALIZADO" title="O que estudar hoje?" description="Uma sugestão diária montada a partir do seu desempenho, revisões, metas e planejamento."/>
    <section className={styles.stats}>
      <StatCard label="Tarefas de hoje" tone="brand" value={data.tasks.length} detail={`${completed} concluídas`}/>
      <StatCard label="Progresso diário" value={`${progress}%`} detail={<ProgressBar value={progress}/>}/>
      <StatCard label="Recomendações abertas" value={data.tasks.length - completed} detail="Prioridades para agora"/>
      <StatCard label="Tempo planejado" tone="gold" value={data.availableMinutes ? `${data.availableMinutes} min` : "Livre"} detail="Segundo seu planner"/>
    </section>
    <div className={styles.gridWide}>
      <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>SEU ESTUDO DE HOJE</p><h2>Roteiro recomendado</h2></div><p>{progress}% concluído</p></div>{data.tasks.length ? <div className={styles.list}>{data.tasks.map((task, index) => <article className={`${styles.recommendation} ${task.completed ? styles.done : ""}`} key={task.key}><span className={styles.number}>{task.completed ? "✓" : index + 1}</span><div><h3>{task.title}</h3><p>{task.kind} · {task.detail}</p></div><form action={toggleTodayTaskAction}><input name="dateKey" type="hidden" value={data.today}/><input name="itemKey" type="hidden" value={task.key}/><input name="completed" type="hidden" value={String(task.completed)}/><button className={task.completed ? styles.secondaryButton : styles.button} type="submit">{task.completed ? "Reabrir" : "Concluir"}</button></form></article>)}</div> : <EmptyPanel title="Roteiro concluído">Seu histórico e planejamento estão em dia.</EmptyPanel>}</section>
      <aside className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>METAS RELACIONADAS</p><h2>Não perca de vista</h2></div></div>{data.goals.length ? <div className={styles.list}>{data.goals.map((goal) => <div className={styles.listItem} key={goal.id}><h3>{goal.title}</h3><p>{goal.current} de {goal.targetValue}</p><ProgressBar value={goal.progress}/></div>)}</div> : <EmptyPanel title="Sem metas ativas">Crie objetivos para enriquecer as recomendações.</EmptyPanel>}<div className={styles.itemActions}><Link className={styles.textButton} href="/painel/metas">Gerenciar metas</Link><Link className={styles.textButton} href="/painel/planejamento">Abrir planner</Link></div></aside>
    </div>
    <p className={styles.notice}>A lista é recalculada diariamente. Disciplinas de menor aproveitamento, revisões vencidas e atividades pendentes recebem prioridade.</p>
  </main>;
}
