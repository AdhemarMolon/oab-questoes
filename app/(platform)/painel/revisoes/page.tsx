import type { Metadata } from "next";
import Link from "next/link";

import { EmptyPanel, PanelPageHeader, StatCard } from "@/components/panel";
import { getReviews } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import { updateQuestionStudyStateAction } from "../actions";
import styles from "../study.module.css";

export const metadata: Metadata = { title: "Revisões" };

export default async function ReviewsPage() {
  const session = await requireUser();
  const data = await getReviews(session.user.id);
  return <main className={styles.page} id="main-content">
    <PanelPageHeader eyebrow="REPETIÇÃO ESPAÇADA" title="Revisões" description="Conteúdos errados e de baixo desempenho voltam em ciclos de 1, 7, 15 e 30 dias."/>
    <section className={styles.stats}>
      <StatCard label="Revisões para hoje" tone="brand" value={data.pending.length} detail="Itens pendentes"/>
      <StatCard label="Caderno de erros" value={data.items.length} detail="Questões acompanhadas"/>
      <StatCard label="Já revisadas" value={data.items.filter((item) => item.reviewedAt).length} detail="Ao menos uma revisão"/>
      <StatCard label="Recuperação" tone="gold" value={`${data.recovery}%`} detail="Acertos após erros"/>
    </section>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>REVISÕES PARA HOJE</p><h2>{data.pending.length} item(ns) aguardando você</h2></div></div>{data.pending.length ? <div className={styles.list}>{data.pending.map((item) => <article className={styles.listItem} key={item.questionId}><header><div><h3>{item.externalId} · {item.subject}</h3><p>{item.exam} · ciclo atual de {item.reviewCycleDays} dia(s)</p></div></header><p className={styles.questionStatement}>{item.statement}</p><div className={styles.itemActions}><Link className={styles.secondaryButton} href={`/questoes?q=${encodeURIComponent(item.externalId)}`}>Abrir questão</Link><form action={updateQuestionStudyStateAction}><input name="questionId" type="hidden" value={item.questionId}/><input name="intent" type="hidden" value="review"/><select aria-label="Próximo ciclo" defaultValue={String(item.reviewCycleDays)} name="cycle"><option value="1">Rever em 1 dia</option><option value="7">Rever em 7 dias</option><option value="15">Rever em 15 dias</option><option value="30">Rever em 30 dias</option></select><button className={styles.button} type="submit">Concluir revisão</button></form></div></article>)}</div> : <EmptyPanel title="Revisões em dia">Não há itens vencidos hoje. Continue resolvendo questões para alimentar os próximos ciclos.</EmptyPanel>}</section>
    <p className={styles.notice}>A prioridade combina erros anteriores, itens nunca revisados e o ciclo escolhido por você. A relevância por assunto será incorporada quando o acervo receber essa taxonomia.</p>
  </main>;
}
