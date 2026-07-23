import Link from "next/link";

import type { Question } from "@/db/schema";

import { deleteQuestionAction, saveQuestionAction } from "../actions";
import styles from "../admin.module.css";

type SubjectRow = { id: string; name: string };
type ExamRow = { id: string; title: string };

export function QuestionForm({
  question,
  exams,
  subjects,
}: {
  question: Question | null;
  exams: ExamRow[];
  subjects: SubjectRow[];
}) {
  const options = question?.options ?? {};
  return (
    <form action={saveQuestionAction} className={styles.editor}>
      {question && <input name="id" type="hidden" value={question.id} />}

      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><h2>Identificação</h2><p>Exame, matéria e referência interna da questão.</p></div></div>
        <div className={styles.formGrid}>
          <label className={styles.formField}>ID externo<input defaultValue={question?.externalId ?? ""} name="externalId" placeholder="Ex.: 41-23" /></label>
          <label className={styles.formField}>Número<input defaultValue={question?.number ?? 1} min="1" max="200" name="number" required type="number" /></label>
          <label className={styles.formField}>Exame<select defaultValue={question?.examId} name="examId" required><option value="">Selecione</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></label>
          <label className={styles.formField}>Matéria<select defaultValue={question?.subjectId} name="subjectId" required><option value="">Selecione</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><h2>Conteúdo e alternativas</h2><p>Quatro opções obrigatórias, preservadas no snapshot de cada tentativa.</p></div></div>
        <label className={styles.formField}>Enunciado<textarea defaultValue={question?.statement ?? ""} name="statement" required rows={8} /></label>
        <div className={styles.optionsGrid} style={{ marginTop: 14 }}>
          {(["A", "B", "C", "D"] as const).map((label) => (
            <label className={styles.formField} key={label}>Alternativa {label}<textarea defaultValue={options[label] ?? ""} name={`option${label}`} required rows={4} /></label>
          ))}
        </div>
        <div className={styles.formGrid} style={{ marginTop: 14 }}>
          <label className={styles.formField}>Gabarito<select defaultValue={question?.correctAnswer ?? ""} name="correctAnswer"><option value="">Sem gabarito</option>{["A", "B", "C", "D"].map((label) => <option key={label}>{label}</option>)}</select></label>
          <label className={styles.checkRow} style={{ alignSelf: "end", minHeight: 42 }}><input defaultChecked={question?.annulled ?? false} name="annulled" type="checkbox" /> Questão anulada</label>
          <label className={`${styles.formField} ${styles.fullField}`}>Explicação opcional<textarea defaultValue={question?.explanation ?? ""} name="explanation" rows={5} /></label>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><h2>Fonte e publicação</h2><p>A verificação é independente do estado de publicação.</p></div></div>
        <div className={styles.formGrid}>
          <label className={styles.formField}>Fonte<input defaultValue={question?.source ?? "Fonte a confirmar"} name="source" required /></label>
          <label className={styles.formField}>URL da fonte<input defaultValue={question?.sourceUrl ?? ""} name="sourceUrl" placeholder="https://…" type="url" /></label>
          <label className={styles.formField}>Status<select defaultValue={question?.status.toLowerCase() ?? "draft"} name="status"><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>
          <label className={styles.formField}>Verificação<select defaultValue={question?.verificationStatus.toLowerCase() ?? "unverified"} name="verificationStatus"><option value="unverified">Não verificada</option><option value="verified">Verificada</option><option value="rejected">Rejeitada</option></select></label>
        </div>
      </section>

      <div className={styles.inlineActions}>
        <button className={styles.actionButton} type="submit">{question ? "Salvar alterações" : "Criar questão"}</button>
        <Link className={styles.secondaryLink} href="/admin/questoes">Cancelar</Link>
      </div>
    </form>
  );
}

export function QuestionDeleteZone({ questionId }: { questionId: string }) {
  return (
    <section className={styles.dangerZone}>
      <h3>Excluir do catálogo</h3>
      <p>A exclusão é lógica: a questão deixa o catálogo, mas snapshots de tentativas anteriores continuam íntegros.</p>
      <form action={deleteQuestionAction} className={styles.inlineForm}>
        <input name="id" type="hidden" value={questionId} />
        <label className={styles.formField}>Motivo<input name="reason" required /></label>
        <button className={styles.dangerButton} type="submit">Excluir questão</button>
      </form>
    </section>
  );
}
