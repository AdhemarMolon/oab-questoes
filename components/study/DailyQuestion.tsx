"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  BRASILIA_TIME_ZONE,
  formatDailyQuestionDate,
  getBrasiliaDateKey,
} from "@/lib/daily-question";

import styles from "./DailyQuestion.module.css";

type DailyQuestionData = {
  id: string;
  externalId: string;
  number: number;
  statement: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string | null;
  source: string | null;
  sourceUrl: string | null;
  subject: string;
  exam: string;
  dateKey: string;
};

type SavedAnswer = {
  questionId: string;
  selectedAnswer: string;
  submitted: boolean;
};

type DailyQuestionProps = {
  question: DailyQuestionData;
  moreQuestionsHref: string;
};

function storageKey(dateKey: string) {
  return `minha-oab:daily-question:${dateKey}`;
}

export function DailyQuestion({
  moreQuestionsHref,
  question,
}: DailyQuestionProps) {
  const router = useRouter();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const options = useMemo(
    () => Object.entries(question.options),
    [question.options],
  );
  const isCorrect = submitted && selectedAnswer === question.correctAnswer;

  useEffect(() => {
    let frame: number | null = null;

    try {
      const saved = window.localStorage.getItem(storageKey(question.dateKey));
      if (!saved) return;
      const answer = JSON.parse(saved) as SavedAnswer;
      if (answer.questionId !== question.id || !answer.submitted) return;
      if (!Object.hasOwn(question.options, answer.selectedAnswer)) return;
      frame = window.requestAnimationFrame(() => {
        setSelectedAnswer(answer.selectedAnswer);
        setSubmitted(true);
      });
    } catch {
      // Storage is an enhancement; the daily question still works without it.
    }

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [question.dateKey, question.id, question.options]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (getBrasiliaDateKey(new Date()) !== question.dateKey) {
        router.refresh();
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [question.dateKey, router]);

  function submitAnswer() {
    if (!selectedAnswer || submitted) return;
    setSubmitted(true);

    try {
      const answer: SavedAnswer = {
        questionId: question.id,
        selectedAnswer,
        submitted: true,
      };
      window.localStorage.setItem(
        storageKey(question.dateKey),
        JSON.stringify(answer),
      );
    } catch {
      // Ignore private browsing/storage errors.
    }
  }

  return (
    <section className={styles.section} id="questao-do-dia">
      <div className={styles.shell}>
        <header className={styles.intro}>
          <div className={styles.kicker}>
            <span aria-hidden="true">◆</span>
            DESAFIO DIÁRIO
          </div>
          <h2>Uma questão por dia.<br />Constância até a aprovação.</h2>
          <p>
            Resolva o desafio de hoje e volte amanhã para uma nova questão do
            acervo oficial.
          </p>
          <div className={styles.schedule}>
            <strong>{formatDailyQuestionDate(question.dateKey)}</strong>
            <span>
              Troca à meia-noite · horário de Brasília ({BRASILIA_TIME_ZONE})
            </span>
          </div>
        </header>

        <article className={styles.card}>
          <div className={styles.progressHeader}>
            <div>
              <span>QUESTÃO DO DIA</span>
              <strong>1 de 1</strong>
            </div>
            <div className={styles.progressTrack} aria-label="Progresso: 100%">
              <i />
            </div>
            <b>{question.subject}</b>
          </div>

          <div className={styles.meta}>
            <span>{question.exam}</span>
            <span>{question.externalId}</span>
          </div>

          <h3>
            <span>{String(question.number).padStart(2, "0")}</span>
            {question.statement}
          </h3>

          <div
            aria-label="Alternativas da questão"
            className={styles.options}
            role="radiogroup"
          >
            {options.map(([label, text]) => {
              const selected = selectedAnswer === label;
              const correct = submitted && question.correctAnswer === label;
              const wrong = submitted && selected && !correct;

              return (
                <button
                  aria-checked={selected}
                  className={`${styles.option} ${selected ? styles.selected : ""} ${correct ? styles.correct : ""} ${wrong ? styles.wrong : ""}`}
                  disabled={submitted}
                  key={label}
                  onClick={() => setSelectedAnswer(label)}
                  role="radio"
                  type="button"
                >
                  <b>{label}</b>
                  <span>{text}</span>
                  {correct ? <i aria-label="Alternativa correta">✓</i> : null}
                  {wrong ? <i aria-label="Alternativa incorreta">×</i> : null}
                </button>
              );
            })}
          </div>

          {submitted ? (
            <div
              aria-live="polite"
              className={`${styles.feedback} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}
            >
              <div className={styles.feedbackIcon} aria-hidden="true">
                {isCorrect ? "✓" : "!"}
              </div>
              <div>
                <strong>
                  {isCorrect
                    ? "Mandou bem! Resposta correta."
                    : `Quase! A resposta correta é ${question.correctAnswer}.`}
                </strong>
                <p>
                  {question.explanation?.trim() ||
                    "Compare as alternativas e revise o fundamento cobrado nesta questão."}
                </p>
                {question.sourceUrl ? (
                  <a href={question.sourceUrl} rel="noreferrer" target="_blank">
                    Consultar fonte oficial ↗
                  </a>
                ) : question.source ? (
                  <small>{question.source}</small>
                ) : null}
              </div>
            </div>
          ) : null}

          <footer className={styles.actions}>
            <span>
              {submitted
                ? "Desafio concluído por hoje."
                : selectedAnswer
                  ? `Alternativa ${selectedAnswer} selecionada.`
                  : "Escolha uma alternativa para continuar."}
            </span>
            {submitted ? (
              <Link href={moreQuestionsHref}>Praticar mais questões →</Link>
            ) : (
              <button
                disabled={!selectedAnswer}
                onClick={submitAnswer}
                type="button"
              >
                Confirmar resposta
              </button>
            )}
          </footer>
        </article>
      </div>
    </section>
  );
}
