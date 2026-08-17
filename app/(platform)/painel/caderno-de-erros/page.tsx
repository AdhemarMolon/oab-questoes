import type { Metadata } from "next";
import Link from "next/link";

import { EmptyPanel, MiniBars, PanelPageHeader, StatCard } from "@/components/panel";
import { getErrorNotebook, listStudySubjects } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import { addFavoriteAction, updateQuestionStudyStateAction } from "../actions";
import styles from "../study.module.css";

export const metadata: Metadata = { title: "Caderno de Erros" };

export default async function ErrorNotebookPage({
  searchParams,
}: {
  searchParams: Promise<{ disciplina?: string; exame?: string; revisao?: string }>;
}) {
  const [session, filters] = await Promise.all([requireUser(), searchParams]);
  const [notebook, subjects] = await Promise.all([
    getErrorNotebook(session.user.id),
    listStudySubjects(),
  ]);
  const exams = [...new Map(notebook.items.map((item) => [item.examId, item.exam])).entries()];
  const items = notebook.items.filter(
    (item) =>
      (!filters.disciplina || item.subjectId === filters.disciplina) &&
      (!filters.exame || item.examId === filters.exame) &&
      (filters.revisao !== "pendente" || !item.reviewedAt),
  );

  return (
    <main className={styles.page} id="main-content">
      <PanelPageHeader
        description="Questões incorretas entram aqui automaticamente para você revisar, anotar e refazer."
        eyebrow="APRENDER COM OS ERROS"
        title="Caderno de Erros"
      />
      <section className={styles.stats}>
        <StatCard detail={`${notebook.items.filter((item) => !item.reviewedAt).length} ainda não revisadas`} label="Questões no caderno" tone="brand" value={notebook.items.length}/>
        <StatCard detail="Acertadas após o primeiro erro" label="Recuperadas" value={notebook.items.filter((item) => item.recovered).length}/>
        <StatCard detail="Percentual após novas tentativas" label="Recuperação" value={`${notebook.recovery}%`}/>
        <StatCard detail={notebook.bySubject[0]?.subject ?? "Sem dados"} label="Maior incidência" tone="gold" value={notebook.bySubject[0]?.errors ?? 0}/>
      </section>
      <div className={styles.gridWide}>
        <section className={styles.panel}>
          <form className={styles.filters}>
            <select defaultValue={filters.disciplina ?? ""} name="disciplina"><option value="">Todas as disciplinas</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
            <select defaultValue={filters.exame ?? ""} name="exame"><option value="">Todos os exames</option>{exams.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>
            <select defaultValue={filters.revisao ?? ""} name="revisao"><option value="">Qualquer revisão</option><option value="pendente">Ainda não revisadas</option></select>
            <button className={styles.secondaryButton} type="submit">Filtrar</button>
          </form>
          {items.length ? (
            <div className={styles.list}>
              {items.map((item) => (
                <article className={styles.listItem} key={item.questionId}>
                  <header><div><h3>{item.externalId} · Questão {item.number}</h3><div className={styles.meta}><span>{item.subject}</span><span>{item.exam}</span><span>{item.recovered ? "Recuperada" : "Reforçar"}</span></div></div>{item.reviewedAt ? <span className={styles.pill}>Revisada</span> : null}</header>
                  <p className={styles.questionStatement}>{item.statement}</p>
                  {item.errorNote ? <p className={styles.notice}>Sua anotação: {item.errorNote}</p> : null}
                  <div className={styles.itemActions}>
                    <Link className={styles.secondaryButton} href={`/questoes?q=${encodeURIComponent(item.externalId)}`}>Refazer questão</Link>
                    <form action={addFavoriteAction}><input name="questionId" type="hidden" value={item.questionId}/><button className={styles.textButton} type="submit">Adicionar às favoritas</button></form>
                    <Link className={styles.textButton} href={`/painel/anotacoes?questao=${item.questionId}&disciplina=${item.subjectId}&titulo=${encodeURIComponent(item.externalId)}`}>Criar anotação</Link>
                    <form action={updateQuestionStudyStateAction}><input name="questionId" type="hidden" value={item.questionId}/><input name="intent" type="hidden" value="review"/><select aria-label="Próximo ciclo" defaultValue="1" name="cycle"><option value="1">1 dia</option><option value="7">7 dias</option><option value="15">15 dias</option><option value="30">30 dias</option></select><button className={styles.textButton} type="submit">Marcar revisada</button></form>
                    <details className={styles.details}><summary>Anotação</summary><form action={updateQuestionStudyStateAction} className={styles.form}><input name="questionId" type="hidden" value={item.questionId}/><input name="intent" type="hidden" value="note"/><input name="cycle" type="hidden" value="1"/><label className={styles.full}>Nota<textarea defaultValue={item.errorNote ?? ""} name="note"/></label><button className={styles.button} type="submit">Salvar nota</button></form></details>
                    <form action={updateQuestionStudyStateAction}><input name="questionId" type="hidden" value={item.questionId}/><input name="intent" type="hidden" value="remove"/><input name="cycle" type="hidden" value="1"/><button className={styles.textButton} type="submit">Remover do caderno</button></form>
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyPanel title="Nenhuma questão neste filtro">Quando você errar uma questão de simulado, ela aparecerá automaticamente aqui.</EmptyPanel>}
        </section>
        <aside className={styles.panel}>
          <div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>INCIDÊNCIA</p><h2>Erros por disciplina</h2></div></div>
          {notebook.bySubject.length ? <MiniBars items={notebook.bySubject.map((item) => ({ label: item.subject, value: notebook.items.length ? Math.round(item.errors / notebook.items.length * 100) : 0, detail: `${item.errors} erros` }))}/> : <p className={styles.notice}>Ainda não há erros registrados.</p>}
          <p className={styles.notice}>O acervo ainda não possui classificação por assunto; os filtros usam disciplina e exame, que são metadados reais.</p>
        </aside>
      </div>
    </main>
  );
}
