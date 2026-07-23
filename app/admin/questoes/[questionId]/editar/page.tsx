import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getQuestionEditorData } from "@/lib/data/admin";

import styles from "../../../admin.module.css";
import { QuestionDeleteZone, QuestionForm } from "../../QuestionForm";

export const metadata: Metadata = { title: "Editar questão — Admin" };

export default async function EditQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const [{ questionId }, messages] = await Promise.all([params, searchParams]);
  const data = await getQuestionEditorData(questionId);
  if (!data.question) notFound();
  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><p>EDITAR QUESTÃO</p><h1>{data.question.externalId}</h1><span>Versão atual: {data.question.version}</span></div></header>
    {messages.erro && <div className={`${styles.notice} ${styles.errorNotice}`}>{messages.erro}</div>}
    <QuestionForm exams={data.exams} question={data.question} subjects={data.subjects} />
    <QuestionDeleteZone questionId={data.question.id} />
  </div>;
}
