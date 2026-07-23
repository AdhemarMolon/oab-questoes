"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, EmptyState } from "@/components/ui";
import styles from "./SimulationRunner.module.css";

export type SimulationOptionLabel = "A" | "B" | "C" | "D";

export interface SimulationOption {
  label: SimulationOptionLabel;
  text: string;
}

export interface SimulationExistingAnswer {
  selectedAnswer: SimulationOptionLabel | null;
  correctAnswer: SimulationOptionLabel | null;
  isCorrect: boolean | null;
  annulled: boolean;
}

export interface SimulationQuestion {
  itemId: string;
  position: number;
  subject: string;
  examLabel: string;
  stem: string;
  options: readonly SimulationOption[];
  existingAnswer?: SimulationExistingAnswer;
}

export interface SimulationAnswerInput {
  attemptId: string;
  itemId: string;
  selectedAnswer: SimulationOptionLabel;
}

export interface SimulationAnswerResult {
  ok: boolean;
  error?: string;
  selectedAnswer?: SimulationOptionLabel;
  correctAnswer?: SimulationOptionLabel | null;
  isCorrect?: boolean | null;
  annulled?: boolean;
  answeredCount?: number;
  total?: number;
  completed?: boolean;
}

export interface SimulationFinishResult {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

export interface SimulationRunnerProps {
  attemptId: string;
  questions: readonly SimulationQuestion[];
  answerAction: (
    input: SimulationAnswerInput,
  ) => Promise<SimulationAnswerResult>;
  finishAction: (attemptId: string) => Promise<SimulationFinishResult>;
}

type StoredAnswer = SimulationExistingAnswer;
type RunnerView = "questions" | "summary";

function isOptionLabel(value: unknown): value is SimulationOptionLabel {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function cloneQuestions(questions: readonly SimulationQuestion[]) {
  return questions
    .map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option })),
      existingAnswer: question.existingAnswer
        ? { ...question.existingAnswer }
        : undefined,
    }))
    .sort((left, right) => left.position - right.position);
}

function getInitialAnswers(questions: readonly SimulationQuestion[]) {
  return questions.reduce<Record<string, StoredAnswer>>((answers, question) => {
    if (question.existingAnswer) {
      answers[question.itemId] = { ...question.existingAnswer };
    }
    return answers;
  }, {});
}

function getInitialSelections(questions: readonly SimulationQuestion[]) {
  return questions.reduce<Partial<Record<string, SimulationOptionLabel>>>(
    (selections, question) => {
      const selected = question.existingAnswer?.selectedAnswer;
      if (selected) selections[question.itemId] = selected;
      return selections;
    },
    {},
  );
}

function validProgressTotal(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || !value || value < 1) return fallback;
  return Math.trunc(value);
}

function validAnsweredCount(
  value: number | undefined,
  fallback: number,
  total: number,
) {
  if (!Number.isFinite(value) || value === undefined) {
    return Math.min(total, Math.max(0, fallback));
  }
  return Math.min(total, Math.max(0, Math.trunc(value)));
}

function safeErrorMessage(error?: string) {
  return error?.trim() || "Não foi possível salvar sua resposta. Tente novamente.";
}

function isSafeInternalPath(path?: string) {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

export function SimulationRunner({
  answerAction,
  attemptId,
  finishAction,
  questions,
}: SimulationRunnerProps) {
  const router = useRouter();
  const idPrefix = useId();
  const submissionLock = useRef(false);
  const finishLock = useRef(false);
  const [sessionQuestions] = useState(() => cloneQuestions(questions));
  const [answers, setAnswers] = useState<Record<string, StoredAnswer>>(() =>
    getInitialAnswers(sessionQuestions),
  );
  const [selections, setSelections] = useState<
    Partial<Record<string, SimulationOptionLabel>>
  >(() => getInitialSelections(sessionQuestions));
  const [currentIndex, setCurrentIndex] = useState(() => {
    const unansweredIndex = sessionQuestions.findIndex(
      (question) => !question.existingAnswer,
    );
    return unansweredIndex >= 0 ? unansweredIndex : 0;
  });
  const [view, setView] = useState<RunnerView>(() =>
    sessionQuestions.length > 0 &&
    sessionQuestions.every((question) => Boolean(question.existingAnswer))
      ? "summary"
      : "questions",
  );
  const [answeredCount, setAnsweredCount] = useState(
    () => Object.keys(getInitialAnswers(sessionQuestions)).length,
  );
  const [progressTotal, setProgressTotal] = useState(sessionQuestions.length);
  const [completed, setCompleted] = useState(
    () =>
      sessionQuestions.length > 0 &&
      sessionQuestions.every((question) => Boolean(question.existingAnswer)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  if (!sessionQuestions.length) {
    return (
      <EmptyState
        description="Nenhuma questão foi vinculada a esta tentativa. Volte ao catálogo e inicie outro simulado."
        icon="§"
        title="Simulado sem questões"
      />
    );
  }

  const currentQuestion = sessionQuestions[currentIndex];
  const currentAnswer = answers[currentQuestion.itemId];
  const selectedAnswer = selections[currentQuestion.itemId];
  const locallyAnswered = Object.keys(answers).length;
  const allLocallyAnswered = locallyAnswered >= sessionQuestions.length;
  const canShowSummary = completed || allLocallyAnswered;
  const progressPercentage = progressTotal
    ? Math.round((answeredCount / progressTotal) * 100)
    : 0;
  const feedbackId = `${idPrefix}-feedback`;
  const radioName = `${idPrefix}-${currentQuestion.itemId}`;

  function selectAnswer(option: SimulationOptionLabel) {
    if (currentAnswer || isSubmitting) return;
    setAnswerError(null);
    setSelections((current) => ({
      ...current,
      [currentQuestion.itemId]: option,
    }));
  }

  async function submitAnswer() {
    if (
      !selectedAnswer ||
      currentAnswer ||
      submissionLock.current ||
      isSubmitting
    ) {
      return;
    }

    submissionLock.current = true;
    setIsSubmitting(true);
    setAnswerError(null);

    try {
      const result = await answerAction({
        attemptId,
        itemId: currentQuestion.itemId,
        selectedAnswer,
      });

      if (!result.ok) {
        setAnswerError(safeErrorMessage(result.error));
        return;
      }

      const confirmedSelection = isOptionLabel(result.selectedAnswer)
        ? result.selectedAnswer
        : selectedAnswer;
      const confirmedCorrectAnswer = isOptionLabel(result.correctAnswer)
        ? result.correctAnswer
        : null;
      const annulled = Boolean(result.annulled);
      const confirmedAnswer: StoredAnswer = {
        selectedAnswer: confirmedSelection,
        correctAnswer: confirmedCorrectAnswer,
        isCorrect: annulled
          ? null
          : typeof result.isCorrect === "boolean"
            ? result.isCorrect
            : confirmedCorrectAnswer
              ? confirmedSelection === confirmedCorrectAnswer
              : null,
        annulled,
      };
      const nextLocalCount = Math.min(
        sessionQuestions.length,
        Object.keys(answers).length + 1,
      );
      const nextTotal = validProgressTotal(result.total, progressTotal);

      setAnswers((current) => ({
        ...current,
        [currentQuestion.itemId]: confirmedAnswer,
      }));
      setSelections((current) => ({
        ...current,
        [currentQuestion.itemId]: confirmedSelection,
      }));
      setProgressTotal(nextTotal);
      setAnsweredCount(
        validAnsweredCount(result.answeredCount, nextLocalCount, nextTotal),
      );
      setCompleted(result.completed ?? nextLocalCount >= sessionQuestions.length);
    } catch {
      setAnswerError("Não foi possível salvar sua resposta. Verifique sua conexão e tente novamente.");
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  function goToQuestion(index: number) {
    if (isSubmitting || index < 0 || index >= sessionQuestions.length) return;
    setAnswerError(null);
    setCurrentIndex(index);
  }

  function goToNext() {
    if (currentIndex < sessionQuestions.length - 1) {
      goToQuestion(currentIndex + 1);
      return;
    }
    if (canShowSummary) {
      setView("summary");
      return;
    }
    const pendingIndex = sessionQuestions.findIndex(
      (question) => !answers[question.itemId],
    );
    if (pendingIndex >= 0 && pendingIndex !== currentIndex) {
      goToQuestion(pendingIndex);
    }
  }

  async function finishSimulation() {
    if (!canShowSummary || finishLock.current || isFinishing || finished) return;

    finishLock.current = true;
    setIsFinishing(true);
    setFinishError(null);

    try {
      const result = await finishAction(attemptId);
      if (!result.ok) {
        setFinishError(
          result.error?.trim() ||
            "Não foi possível finalizar o simulado. Tente novamente.",
        );
        return;
      }

      setFinished(true);
      if (isSafeInternalPath(result.redirectTo)) {
        router.push(result.redirectTo!);
      }
    } catch {
      setFinishError(
        "Não foi possível finalizar o simulado. Verifique sua conexão e tente novamente.",
      );
    } finally {
      finishLock.current = false;
      setIsFinishing(false);
    }
  }

  if (view === "summary") {
    const answerValues = Object.values(answers);
    const annulledCount = answerValues.filter((answer) => answer.annulled).length;
    const correctCount = answerValues.filter(
      (answer) => !answer.annulled && answer.isCorrect === true,
    ).length;
    const incorrectCount = answerValues.filter(
      (answer) => !answer.annulled && answer.isCorrect === false,
    ).length;
    const pendingCount = Math.max(0, progressTotal - answeredCount);

    return (
      <section aria-labelledby={`${idPrefix}-summary-title`} className={styles.summary}>
        <div aria-hidden="true" className={styles.summarySeal}>✓</div>
        <p className={styles.eyebrow}>Resumo da tentativa</p>
        <h1 id={`${idPrefix}-summary-title`}>
          {finished ? "Simulado finalizado" : "Respostas concluídas"}
        </h1>
        <p className={styles.summaryLead}>
          {finished
            ? "Seu resultado foi registrado. Você ainda pode revisar cada questão desta tentativa."
            : "Confira seu desempenho e finalize para registrar a conclusão desta tentativa."}
        </p>

        <dl className={styles.resultGrid}>
          <div className={styles.resultPrimary}>
            <dt>Aproveitamento</dt>
            <dd>
              {correctCount + incorrectCount
                ? Math.round((correctCount / (correctCount + incorrectCount)) * 100)
                : 0}
              <small>%</small>
            </dd>
          </div>
          <div>
            <dt>Acertos</dt>
            <dd>{correctCount}</dd>
          </div>
          <div>
            <dt>Erros</dt>
            <dd>{incorrectCount}</dd>
          </div>
          <div>
            <dt>Anuladas</dt>
            <dd>{annulledCount}</dd>
          </div>
          <div>
            <dt>Pendentes</dt>
            <dd>{pendingCount}</dd>
          </div>
        </dl>

        {finishError ? <p className={styles.error} role="alert">{finishError}</p> : null}
        {finished ? (
          <p aria-live="polite" className={styles.finishSuccess} role="status">
            Sua tentativa foi finalizada e salva com sucesso.
          </p>
        ) : null}

        <div className={styles.summaryActions}>
          <Button
            disabled={isFinishing}
            onClick={() => {
              setFinishError(null);
              setView("questions");
              setCurrentIndex(0);
            }}
            variant="secondary"
          >
            Revisar questões
          </Button>
          <Button
            disabled={!canShowSummary || finished}
            loading={isFinishing}
            loadingLabel="Finalizando simulado"
            onClick={finishSimulation}
          >
            {finished ? "Finalizado" : "Finalizar simulado"}
          </Button>
        </div>
      </section>
    );
  }

  const lastQuestion = currentIndex === sessionQuestions.length - 1;
  const pendingIndex = lastQuestion
    ? sessionQuestions.findIndex((question) => !answers[question.itemId])
    : -1;
  const nextDisabled =
    isSubmitting ||
    (lastQuestion && !canShowSummary && (pendingIndex < 0 || pendingIndex === currentIndex));
  const nextLabel = lastQuestion
    ? canShowSummary
      ? "Ver resumo"
      : "Ir para pendente"
    : "Próxima";

  return (
    <section aria-labelledby={`${idPrefix}-question-title`} className={styles.runner}>
      <header className={styles.runnerHeader}>
        <div>
          <p className={styles.eyebrow}>Simulado em andamento</p>
          <div className={styles.questionMeta}>
            <Badge variant="admin">{currentQuestion.examLabel}</Badge>
            <Badge>{currentQuestion.subject}</Badge>
          </div>
        </div>
        {canShowSummary ? (
          <Button onClick={() => setView("summary")} size="small" variant="ghost">
            Ver resumo
          </Button>
        ) : null}
      </header>

      <div className={styles.progressBlock}>
        <div className={styles.progressCopy}>
          <span>
            Questão {currentIndex + 1} de {sessionQuestions.length}
          </span>
          <span>{answeredCount} de {progressTotal} respondidas</span>
        </div>
        <div
          aria-label={`${answeredCount} de ${progressTotal} questões respondidas`}
          aria-valuemax={progressTotal}
          aria-valuemin={0}
          aria-valuenow={answeredCount}
          className={styles.progressTrack}
          role="progressbar"
        >
          <span style={{ width: `${Math.min(100, progressPercentage)}%` }} />
        </div>
      </div>

      <article className={styles.questionCard}>
        <div className={styles.questionNumber} aria-hidden="true">
          {String(currentQuestion.position).padStart(2, "0")}.
        </div>
        <div className={styles.questionBody}>
          <h1 className={styles.stem} id={`${idPrefix}-question-title`}>
            {currentQuestion.stem}
          </h1>

          <fieldset
            aria-describedby={currentAnswer ? feedbackId : undefined}
            className={styles.options}
            disabled={Boolean(currentAnswer) || isSubmitting}
          >
            <legend className={styles.srOnly}>Escolha uma alternativa</legend>
            {currentQuestion.options.map((option) => {
              const selected = selectedAnswer === option.label;
              const isConfirmedCorrect = Boolean(
                currentAnswer &&
                  !currentAnswer.annulled &&
                  (currentAnswer.correctAnswer === option.label ||
                    (currentAnswer.isCorrect === true && selected)),
              );
              const isConfirmedWrong = Boolean(
                currentAnswer &&
                  !currentAnswer.annulled &&
                  selected &&
                  currentAnswer.isCorrect === false,
              );
              const optionClasses = [
                styles.option,
                selected && styles.optionSelected,
                isConfirmedCorrect && styles.optionCorrect,
                isConfirmedWrong && styles.optionWrong,
                currentAnswer?.annulled && selected && styles.optionAnnulled,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <label className={optionClasses} key={option.label}>
                  <input
                    checked={selected}
                    className={styles.radio}
                    name={radioName}
                    onChange={() => selectAnswer(option.label)}
                    type="radio"
                    value={option.label}
                  />
                  <span aria-hidden="true" className={styles.optionLetter}>
                    {option.label}
                  </span>
                  <span>{option.text}</span>
                </label>
              );
            })}
          </fieldset>

          {currentAnswer ? (
            <div
              aria-live="polite"
              className={[
                styles.feedback,
                currentAnswer.annulled
                  ? styles.feedbackAnnulled
                  : currentAnswer.isCorrect === true
                    ? styles.feedbackCorrect
                    : currentAnswer.isCorrect === false
                      ? styles.feedbackWrong
                      : styles.feedbackNeutral,
              ].join(" ")}
              id={feedbackId}
              role="status"
            >
              <strong>
                {currentAnswer.annulled
                  ? "Questão anulada"
                  : currentAnswer.isCorrect === true
                    ? "Resposta correta"
                    : currentAnswer.isCorrect === false
                      ? "Resposta incorreta"
                      : "Resposta registrada"}
              </strong>
              <span>
                {currentAnswer.annulled
                  ? "Ela foi contabilizada conforme as regras do simulado."
                  : currentAnswer.isCorrect === false && currentAnswer.correctAnswer
                    ? `O gabarito confirmado é a alternativa ${currentAnswer.correctAnswer}.`
                    : "Sua resposta foi salva nesta tentativa."}
              </span>
            </div>
          ) : null}

          {answerError ? <p className={styles.error} role="alert">{answerError}</p> : null}
        </div>
      </article>

      <footer className={styles.runnerFooter}>
        <Button
          disabled={currentIndex === 0 || isSubmitting}
          onClick={() => goToQuestion(currentIndex - 1)}
          variant="ghost"
        >
          ← Anterior
        </Button>
        {!currentAnswer ? (
          <Button
            disabled={!selectedAnswer}
            loading={isSubmitting}
            loadingLabel="Salvando resposta"
            onClick={submitAnswer}
          >
            Confirmar resposta
          </Button>
        ) : (
          <span className={styles.savedLabel}>Resposta salva</span>
        )}
        <Button disabled={nextDisabled} onClick={goToNext} variant="secondary">
          {nextLabel} <span aria-hidden="true">→</span>
        </Button>
      </footer>
    </section>
  );
}
