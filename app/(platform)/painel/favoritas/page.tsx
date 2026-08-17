import type { Metadata } from "next";
import Link from "next/link";

import { EmptyPanel, PanelPageHeader, StatCard } from "@/components/panel";
import { getFavoriteQuestions } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import { removeFavoriteAction } from "../actions";
import styles from "../study.module.css";

export const metadata: Metadata = { title: "Questões Favoritas" };

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ disciplina?: string; exame?: string; ano?: string; status?: string }> }) {
  const [session, filters] = await Promise.all([requireUser(), searchParams]);
  const all = await getFavoriteQuestions(session.user.id);
  const subjectOptions = [...new Map(all.map((item) => [item.subjectId, item.subject])).entries()];
  const examOptions = [...new Map(all.map((item) => [item.examId, item.exam])).entries()];
  const years = [...new Set(all.map((item) => item.year))].sort((a, b) => b - a);
  const items = all.filter((item) => (!filters.disciplina || item.subjectId === filters.disciplina) && (!filters.exame || item.examId === filters.exame) && (!filters.ano || String(item.year) === filters.ano) && (!filters.status || item.status === filters.status));
  return <main className={styles.page} id="main-content"><PanelPageHeader eyebrow="SUA SELEÇÃO" title="Questões Favoritas" description="Reencontre rapidamente as questões que você decidiu guardar."/><section className={styles.stats}><StatCard label="Favoritas" tone="brand" value={all.length} detail={`${items.length} no filtro atual`}/><StatCard label="Disciplinas" value={subjectOptions.length} detail="Representadas na coleção"/></section><section className={styles.panel} style={{ marginTop: 14 }}><form className={styles.filters}><select defaultValue={filters.disciplina ?? ""} name="disciplina"><option value="">Todas as disciplinas</option>{subjectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select defaultValue={filters.exame ?? ""} name="exame"><option value="">Todos os exames</option>{examOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select defaultValue={filters.ano ?? ""} name="ano"><option value="">Todos os anos</option>{years.map((year) => <option key={year}>{year}</option>)}</select><select defaultValue={filters.status ?? ""} name="status"><option value="">Qualquer status</option><option value="PUBLISHED">Disponível</option><option value="ARCHIVED">Arquivada</option></select><button className={styles.secondaryButton} type="submit">Filtrar</button></form>{items.length ? <div className={styles.list}>{items.map((item) => <article className={styles.listItem} key={item.id}><header><div><h3>{item.externalId} · Questão {item.number}</h3><div className={styles.meta}><span>{item.subject}</span><span>{item.exam}</span><span>{item.year}</span></div></div></header><p className={styles.questionStatement}>{item.statement}</p><div className={styles.itemActions}><Link className={styles.secondaryButton} href={`/questoes?q=${encodeURIComponent(item.externalId)}`}>Acessar questão</Link><form action={removeFavoriteAction}><input name="questionId" type="hidden" value={item.id}/><button className={styles.textButton} type="submit">Remover dos favoritos</button></form></div></article>)}</div> : <EmptyPanel title="Nenhuma favorita neste filtro">Marque questões como favoritas durante seus estudos para encontrá-las aqui.</EmptyPanel>}</section></main>;
}
