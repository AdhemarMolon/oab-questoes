import type { Metadata } from "next";

import { EmptyPanel, PanelPageHeader, StatCard } from "@/components/panel";
import { getNotes, listStudySubjects } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import { deleteNoteAction, saveNoteAction, toggleNoteFavoriteAction } from "../actions";
import styles from "../study.module.css";

export const metadata: Metadata = { title: "Minhas Anotações" };

function NoteForm({ subjects, note, initial }: { subjects: Awaited<ReturnType<typeof listStudySubjects>>; note?: Awaited<ReturnType<typeof getNotes>>[number]; initial?: { questionId?: string; subjectId?: string; title?: string } }) {
  return <form action={saveNoteAction} className={styles.form}><input name="id" type="hidden" value={note?.id ?? ""}/><input name="questionId" type="hidden" value={note?.questionId ?? initial?.questionId ?? ""}/><label>Título<input defaultValue={note?.title ?? initial?.title ?? ""} maxLength={180} name="title" required/></label><label>Disciplina<select defaultValue={note?.subjectId ?? initial?.subjectId ?? ""} name="subjectId"><option value="">Sem disciplina</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label className={styles.full}>Anotação<textarea defaultValue={note?.content ?? ""} maxLength={10000} name="content" placeholder="Conceito, artigo de lei, erro recorrente..." required/></label><label className={styles.full}>Tags separadas por vírgula<input defaultValue={note?.tags.join(", ") ?? ""} name="tags" placeholder="constitucional, revisão, artigo 5º"/></label><div className={styles.formActions}><button className={styles.button} type="submit">{note ? "Salvar alterações" : "Criar anotação"}</button></div></form>;
}

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ busca?: string; disciplina?: string; questao?: string; titulo?: string }> }) {
  const [session, filters] = await Promise.all([requireUser(), searchParams]);
  const [notes, subjects] = await Promise.all([getNotes(session.user.id, { query: filters.busca, subjectId: filters.disciplina }), listStudySubjects()]);
  return <main className={styles.page} id="main-content">
    <PanelPageHeader eyebrow="SEU MATERIAL" title="Minhas Anotações" description="Registre conceitos, artigos, questões e pontos importantes para revisão."/>
    <section className={styles.stats}><StatCard label="Anotações encontradas" tone="brand" value={notes.length} detail="No filtro atual"/><StatCard label="Favoritas" value={notes.filter((note) => note.isFavorite).length} detail="Fixadas no topo"/></section>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>NOVA ANOTAÇÃO</p><h2>{filters.questao ? "Anotação vinculada à questão" : "Registre enquanto está fresco"}</h2></div></div><NoteForm initial={{ questionId: filters.questao, subjectId: filters.disciplina, title: filters.titulo }} subjects={subjects}/></section>
    <section className={styles.panel} style={{ marginTop: 14 }}><form className={styles.filters}><input defaultValue={filters.busca ?? ""} name="busca" placeholder="Pesquisar título, texto ou tag"/><select defaultValue={filters.disciplina ?? ""} name="disciplina"><option value="">Todas as disciplinas</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><button className={styles.secondaryButton} type="submit">Pesquisar</button></form>{notes.length ? <div className={styles.grid2}>{notes.map((note) => <article className={styles.listItem} key={note.id}><header><div><h3>{note.title}</h3><div className={styles.meta}><span>{note.subject ?? "Geral"}</span>{note.questionId ? <span>Ligada a uma questão</span> : null}</div></div>{note.isFavorite ? <span className={styles.pill}>★ Favorita</span> : null}</header><p>{note.content}</p><div className={styles.tags}>{note.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><div className={styles.itemActions}><form action={toggleNoteFavoriteAction}><input name="id" type="hidden" value={note.id}/><input name="favorite" type="hidden" value={String(note.isFavorite)}/><button className={styles.textButton} type="submit">{note.isFavorite ? "Desfavoritar" : "Favoritar"}</button></form><details className={styles.details}><summary>Editar</summary><NoteForm note={note} subjects={subjects}/></details><form action={deleteNoteAction}><input name="id" type="hidden" value={note.id}/><button className={styles.textButton} type="submit">Excluir</button></form></div></article>)}</div> : <EmptyPanel title="Nenhuma anotação encontrada">Crie uma anotação ou altere os filtros de pesquisa.</EmptyPanel>}</section>
  </main>;
}
