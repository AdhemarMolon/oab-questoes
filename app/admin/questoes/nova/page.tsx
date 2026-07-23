import type { Metadata } from "next";

import { getQuestionEditorData } from "@/lib/data/admin";

import styles from "../../admin.module.css";
import { QuestionForm } from "../QuestionForm";

export const metadata: Metadata = { title: "Nova questão — Admin" };

export default async function NewQuestionPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const [data, messages] = await Promise.all([getQuestionEditorData(), searchParams]);
  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><p>NOVA QUESTÃO</p><h1>Criar conteúdo</h1><span>Comece como rascunho até concluir a conferência.</span></div></header>
    {messages.erro && <div className={`${styles.notice} ${styles.errorNotice}`}>{messages.erro}</div>}
    <QuestionForm exams={data.exams} question={null} subjects={data.subjects} />
  </div>;
}
