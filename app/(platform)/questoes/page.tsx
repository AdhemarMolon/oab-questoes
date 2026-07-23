import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Pagination } from "@/components/ui";
import { getUserAccess } from "@/lib/data/access";
import { listPublishedQuestions } from "@/lib/data/questions";
import { getTotalPages } from "@/lib/pagination";
import { requireUser } from "@/lib/session";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "Banco de questões" };

type SearchParams = { page?: string; q?: string; subject?: string; exam?: string };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [session, params] = await Promise.all([requireUser(), searchParams]);
  const access = await getUserAccess(session.user.id);

  if (!access.hasFullAccess) {
    return <main className={styles.paywallPage} id="main-content">
      <section>
        <p>BANCO DE QUESTÕES</p>
        <h1>O acervo completo faz parte dos planos pagos.</h1>
        <span>Seu acesso gratuito continua incluindo um simulado completo e as estatísticas básicas.</span>
        <div><Link href="/simulados">Usar meu simulado</Link><Link href="/planos">Ver modalidades →</Link></div>
      </section>
    </main>;
  }

  const result = await listPublishedQuestions({ page: params.page, query: params.q, subjectId: params.subject, examId: params.exam });
  const totalPages = getTotalPages(result.total, result.pageSize);

  return <main className={styles.page} id="main-content">
    <header className={styles.intro}><div><p>BANCO DE QUESTÕES</p><h1>Explore o acervo completo.</h1><span>{result.total} questão(ões) publicada(s).</span></div><Badge variant="premium">Acesso completo</Badge></header>
    <form className={styles.filters} method="get">
      <label>Buscar<input defaultValue={params.q} name="q" placeholder="ID ou trecho do enunciado" /></label>
      <label>Matéria<select defaultValue={params.subject ?? ""} name="subject"><option value="">Todas</option>{result.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
      <label>Exame<select defaultValue={params.exam ?? ""} name="exam"><option value="">Todos</option>{result.exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></label>
      <button type="submit">Filtrar</button>
    </form>
    <section className={styles.list}>
      {result.questions.map((question) => <article key={question.id}>
        <header><div><Badge variant="neutral">{question.exam}</Badge><Badge variant="info">{question.subject}</Badge>{question.verificationStatus !== "VERIFIED" && <Badge variant="warning">Fonte em conferência</Badge>}</div><span>{question.externalId}</span></header>
        <h2><b>{question.number}.</b> {question.statement}</h2>
        <ol>{Object.entries(question.options).map(([label, text]) => <li key={label}><b>{label}</b><span>{text}</span></li>)}</ol>
        <details><summary>Ver gabarito e observações</summary><div className={styles.answer}>{question.annulled ? "Questão anulada." : `Gabarito: ${question.correctAnswer}.`} {question.explanation || "Sem comentário cadastrado."}</div></details>
      </article>)}
      {!result.questions.length && <div className={styles.empty}><h2>Nenhuma questão encontrada.</h2><p>Altere os filtros e tente novamente.</p></div>}
    </section>
    <Pagination basePath="/questoes" currentPage={result.page} searchParams={{ q: params.q, subject: params.subject, exam: params.exam }} totalPages={totalPages} />
  </main>;
}
