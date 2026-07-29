"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge, Button, EmptyState } from "@/components/ui";
import {
  formatSimulationTime,
  type SimulationClock,
} from "@/lib/simulation-attempt";

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
  skipped?: boolean;
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

export interface SimulationSkipInput {
  attemptId: string;
  itemId: string;
}

export interface SimulationSkipResult {
  ok: boolean;
  error?: string;
}

export interface SimulationFinishResult {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

export interface SimulationPauseResult {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

export interface SimulationRunnerProps {
  attemptId: string;
  questions: readonly SimulationQuestion[];
  hasTimeLimit: boolean;
  initialTimeSeconds: number;
  answerAction: (
    input: SimulationAnswerInput,
  ) => Promise<SimulationAnswerResult>;
  skipAction: (input: SimulationSkipInput) => Promise<SimulationSkipResult>;
  finishAction: (attemptId: string) => Promise<SimulationFinishResult>;
  pauseAction: (attemptId: string) => Promise<SimulationPauseResult>;
}

type StoredAnswer = SimulationExistingAnswer;
type FinishTrigger = "manual" | "timeout";

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

function getInitialSkippedItems(questions: readonly SimulationQuestion[]) {
  return new Set(
    questions
      .filter((question) => question.skipped && !question.existingAnswer)
      .map((question) => question.itemId),
  );
}

function safeErrorMessage(error?: string, fallback?: string) {
  return (
    error?.trim() ||
    fallback ||
    "Não foi possível concluir esta operação. Tente novamente."
  );
}

function isSafeInternalPath(path?: string) {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

function useAttemptClock(input: {
  countdown: boolean;
  initialTimeSeconds: number;
  onExpire: () => void;
}) {
  const onExpireRef = useRef(input.onExpire);
  const expirationNotified = useRef(false);
  const [clock, setClock] = useState<SimulationClock>(() => ({
    mode: input.countdown ? "countdown" : "elapsed",
    seconds: Math.max(0, Math.trunc(input.initialTimeSeconds)),
    expired: Boolean(input.countdown && input.initialTimeSeconds <= 0),
  }));

  useEffect(() => {
    onExpireRef.current = input.onExpire;
  }, [input.onExpire]);

  useEffect(() => {
    const initialSeconds = Math.max(
      0,
      Math.trunc(input.initialTimeSeconds),
    );
    const startedAt = performance.now();

    function updateClock() {
      const elapsedSeconds = Math.max(
        0,
        Math.floor((performance.now() - startedAt) / 1000),
      );
      const seconds = input.countdown
        ? Math.max(0, initialSeconds - elapsedSeconds)
        : initialSeconds + elapsedSeconds;
      const nextClock: SimulationClock = {
        mode: input.countdown ? "countdown" : "elapsed",
        seconds,
        expired: input.countdown && seconds === 0,
      };
      setClock(nextClock);

      if (
        nextClock.mode === "countdown" &&
        nextClock.expired &&
        !expirationNotified.current
      ) {
        expirationNotified.current = true;
        onExpireRef.current();
      }
    }

    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, [input.countdown, input.initialTimeSeconds]);

  return clock;
}

function navigationLabel(input: {
  number: number;
  answered: boolean;
  skipped: boolean;
  current: boolean;
}) {
  const status = input.answered
    ? "respondida"
    : input.skipped
      ? "pulada"
      : "sem resposta";
  return `Questão ${input.number}: ${status}${input.current ? ", atual" : ""}`;
}

export function SimulationRunner({
  answerAction,
  attemptId,
  finishAction,
  hasTimeLimit,
  initialTimeSeconds,
  pauseAction,
  questions,
  skipAction,
}: SimulationRunnerProps) {
  const router = useRouter();
  const idPrefix = useId();
  const submissionLock = useRef(false);
  const skipLock = useRef(false);
  const finishLock = useRef(false);
  const pauseLock = useRef(false);
  const finishDialogRef = useRef<HTMLDivElement>(null);
  const finishDialogTriggerRef = useRef<HTMLElement | null>(null);
  const pauseDialogRef = useRef<HTMLDivElement>(null);
  const pauseDialogTriggerRef = useRef<HTMLElement | null>(null);
  const [sessionQuestions] = useState(() => cloneQuestions(questions));
  const [answers, setAnswers] = useState<Record<string, StoredAnswer>>(() =>
    getInitialAnswers(sessionQuestions),
  );
  const [selections, setSelections] = useState<
    Partial<Record<string, SimulationOptionLabel>>
  >(() => getInitialSelections(sessionQuestions));
  const [skippedItems, setSkippedItems] = useState(() =>
    getInitialSkippedItems(sessionQuestions),
  );
  const [currentIndex, setCurrentIndex] = useState(() => {
    const unansweredIndex = sessionQuestions.findIndex(
      (question) => !question.existingAnswer && !question.skipped,
    );
    if (unansweredIndex >= 0) return unansweredIndex;
    const skippedIndex = sessionQuestions.findIndex(
      (question) => !question.existingAnswer,
    );
    return skippedIndex >= 0 ? skippedIndex : 0;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isConfirmingPending, setIsConfirmingPending] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [finishTrigger, setFinishTrigger] = useState<FinishTrigger | null>(
    null,
  );
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);

  const clock = useAttemptClock({
    countdown: hasTimeLimit,
    initialTimeSeconds,
    onExpire: () => {
      void finishSimulation("timeout");
    },
  });

  useEffect(() => {
    if (showFinishConfirm) {
      finishDialogRef.current?.focus();
      return;
    }
    if (!isFinishing && finishDialogTriggerRef.current) {
      finishDialogTriggerRef.current.focus();
      finishDialogTriggerRef.current = null;
    }
  }, [isFinishing, showFinishConfirm]);

  useEffect(() => {
    if (showPauseConfirm) {
      pauseDialogRef.current?.focus();
      return;
    }
    if (!isPausing && pauseDialogTriggerRef.current) {
      pauseDialogTriggerRef.current.focus();
      pauseDialogTriggerRef.current = null;
    }
  }, [isPausing, showPauseConfirm]);

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
  const answeredCount = Object.keys(answers).length;
  const skippedCount = sessionQuestions.filter(
    (question) =>
      skippedItems.has(question.itemId) && !answers[question.itemId],
  ).length;
  const unansweredCount = Math.max(
    0,
    sessionQuestions.length - answeredCount - skippedCount,
  );
  const pendingAtFinish = Math.max(
    0,
    sessionQuestions.length - answeredCount,
  );
  const pendingSelectionCount = sessionQuestions.filter(
    (question) =>
      Boolean(selections[question.itemId]) && !answers[question.itemId],
  ).length;
  const progressPercentage = sessionQuestions.length
    ? Math.round((answeredCount / sessionQuestions.length) * 100)
    : 0;
  const feedbackId = `${idPrefix}-feedback`;
  const radioName = `${idPrefix}-${currentQuestion.itemId}`;
  const clockCritical =
    clock.mode === "countdown" && clock.seconds > 0 && clock.seconds <= 300;

  function clearMessages() {
    setAnswerError(null);
    setFinishError(null);
    setDialogError(null);
  }

  function openFinishDialog() {
    finishDialogTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setFinishError(null);
    setDialogError(null);
    setShowFinishConfirm(true);
  }

  function openPauseDialog() {
    pauseDialogTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDialogError(null);
    setShowPauseConfirm(true);
  }

  function handleFinishDialogKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
  ) {
    if (event.key === "Escape" && !isFinishing && !isConfirmingPending) {
      setShowFinishConfirm(false);
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = finishDialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === finishDialogRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handlePauseDialogKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
  ) {
    if (event.key === "Escape" && !isPausing && !isConfirmingPending) {
      setShowPauseConfirm(false);
    }
  }

  function selectAnswer(option: SimulationOptionLabel) {
    if (
      currentAnswer ||
      isSubmitting ||
      isSkipping ||
      clock.expired
    ) {
      return;
    }
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
      isSubmitting ||
      isSkipping ||
      clock.expired
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
        setAnswerError(
          safeErrorMessage(
            result.error,
            "Não foi possível salvar sua resposta. Tente novamente.",
          ),
        );
        return;
      }

      const confirmedSelection = isOptionLabel(result.selectedAnswer)
        ? result.selectedAnswer
        : selectedAnswer;
      const confirmedAnswer: StoredAnswer = {
        selectedAnswer: confirmedSelection,
        correctAnswer: null,
        isCorrect: null,
        annulled: false,
      };

      setAnswers((current) => ({
        ...current,
        [currentQuestion.itemId]: confirmedAnswer,
      }));
      setSelections((current) => ({
        ...current,
        [currentQuestion.itemId]: confirmedSelection,
      }));
      setSkippedItems((current) => {
        const next = new Set(current);
        next.delete(currentQuestion.itemId);
        return next;
      });
    } catch {
      setAnswerError(
        "Não foi possível salvar sua resposta. Verifique sua conexão e tente novamente.",
      );
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  function goToQuestion(index: number) {
    if (
      isSubmitting ||
      isSkipping ||
      index < 0 ||
      index >= sessionQuestions.length
    ) {
      return;
    }
    clearMessages();
    setCurrentIndex(index);
    setNavigatorOpen(false);
  }

  function goToNext() {
    goToQuestion((currentIndex + 1) % sessionQuestions.length);
  }

  async function skipCurrentQuestion() {
    if (
      currentAnswer ||
      skipLock.current ||
      isSkipping ||
      isSubmitting ||
      clock.expired
    ) {
      return;
    }

    skipLock.current = true;
    setIsSkipping(true);
    setAnswerError(null);

    try {
      const result = await skipAction({
        attemptId,
        itemId: currentQuestion.itemId,
      });

      if (!result.ok) {
        setAnswerError(
          safeErrorMessage(
            result.error,
            "Não foi possível pular esta questão. Tente novamente.",
          ),
        );
        return;
      }

      setSkippedItems((current) => {
        const next = new Set(current);
        next.add(currentQuestion.itemId);
        return next;
      });
      setSelections((current) => {
        const next = { ...current };
        delete next[currentQuestion.itemId];
        return next;
      });
      setCurrentIndex((currentIndex + 1) % sessionQuestions.length);
    } catch {
      setAnswerError(
        "Não foi possível pular esta questão. Verifique sua conexão e tente novamente.",
      );
    } finally {
      skipLock.current = false;
      setIsSkipping(false);
    }
  }

  async function confirmPendingAnswers() {
    if (
      submissionLock.current ||
      skipLock.current ||
      finishLock.current ||
      pauseLock.current ||
      isConfirmingPending
    ) {
      return;
    }

    const pending = sessionQuestions.flatMap((question) => {
      const selection = selections[question.itemId];
      return selection && !answers[question.itemId]
        ? [{ question, selection }]
        : [];
    });
    if (!pending.length) return;

    submissionLock.current = true;
    setIsConfirmingPending(true);
    setDialogError(null);

    const confirmedAnswers: Record<string, StoredAnswer> = {};
    const confirmedIds: string[] = [];

    try {
      for (const { question, selection } of pending) {
        const result = await answerAction({
          attemptId,
          itemId: question.itemId,
          selectedAnswer: selection,
        });

        if (!result.ok) {
          setDialogError(
            safeErrorMessage(
              result.error,
              "Não foi possível confirmar todas as questões pendentes.",
            ),
          );
          return;
        }

        confirmedAnswers[question.itemId] = {
          selectedAnswer: isOptionLabel(result.selectedAnswer)
            ? result.selectedAnswer
            : selection,
          correctAnswer: null,
          isCorrect: null,
          annulled: false,
        };
        confirmedIds.push(question.itemId);
      }

      setAnswers((current) => ({ ...current, ...confirmedAnswers }));
      setSkippedItems((current) => {
        const next = new Set(current);
        for (const itemId of confirmedIds) next.delete(itemId);
        return next;
      });
    } catch {
      setDialogError(
        "Não foi possível confirmar todas as questões pendentes. Verifique sua conexão e tente novamente.",
      );
    } finally {
      submissionLock.current = false;
      setIsConfirmingPending(false);
    }
  }

  async function pauseSimulation() {
    if (
      pauseLock.current ||
      isPausing ||
      submissionLock.current ||
      skipLock.current ||
      finishLock.current
    ) {
      return;
    }

    pauseLock.current = true;
    setIsPausing(true);
    setDialogError(null);

    try {
      const result = await pauseAction(attemptId);
      if (!result.ok) {
        setDialogError(
          safeErrorMessage(
            result.error,
            "Não foi possível pausar o simulado. Tente novamente.",
          ),
        );
        return;
      }

      setShowPauseConfirm(false);
      if (isSafeInternalPath(result.redirectTo)) {
        router.push(result.redirectTo!);
      }
    } catch {
      setDialogError(
        "Não foi possível pausar o simulado. Verifique sua conexão e tente novamente.",
      );
    } finally {
      pauseLock.current = false;
      setIsPausing(false);
    }
  }

  async function finishSimulation(trigger: FinishTrigger) {
    if (finished || finishLock.current || isFinishing) return;

    if (submissionLock.current || skipLock.current) {
      if (trigger === "timeout") {
        window.setTimeout(() => {
          void finishSimulation("timeout");
        }, 350);
      }
      return;
    }

    finishLock.current = true;
    setFinishTrigger(trigger);
    setIsFinishing(true);
    setShowFinishConfirm(false);
    setFinishError(null);

    try {
      const result = await finishAction(attemptId);
      if (!result.ok) {
        setFinishError(
          safeErrorMessage(
            result.error,
            "Não foi possível finalizar o simulado. Tente novamente.",
          ),
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

  return (
    <>
      <section
        aria-labelledby={`${idPrefix}-question-title`}
        className={styles.runner}
        inert={showFinishConfirm || showPauseConfirm ? true : undefined}
      >
        <div className={styles.runnerLayout}>
          <div className={styles.mainColumn}>
            <header className={styles.runnerHeader}>
              <div>
                <p className={styles.eyebrow}>Simulado em andamento</p>
                <div className={styles.questionMeta}>
                  <Badge variant="admin">{currentQuestion.examLabel}</Badge>
                  <Badge>{currentQuestion.subject}</Badge>
                </div>
              </div>
              <span className={styles.questionPosition}>
                <span>Questão</span> <strong>{currentIndex + 1}</strong>{" "}
                <span>de {sessionQuestions.length}</span>
              </span>
            </header>

            <div className={styles.progressBlock}>
              <div className={styles.progressCopy}>
                <span>{answeredCount} respondidas</span>
                <span>
                  {skippedCount} puladas · {unansweredCount} sem resposta
                </span>
              </div>
              <div
                aria-label={`${answeredCount} de ${sessionQuestions.length} questões respondidas`}
                aria-valuemax={sessionQuestions.length}
                aria-valuemin={0}
                aria-valuenow={answeredCount}
                className={styles.progressTrack}
                role="progressbar"
              >
                <span
                  style={{ width: `${Math.min(100, progressPercentage)}%` }}
                />
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
                  disabled={
                    Boolean(currentAnswer) ||
                    isSubmitting ||
                    isSkipping ||
                    clock.expired
                  }
                >
                  <legend className={styles.srOnly}>
                    Escolha uma alternativa
                  </legend>
                  {currentQuestion.options.map((option) => {
                    const selected = selectedAnswer === option.label;
                    const optionClasses = [
                      styles.option,
                      selected && styles.optionSelected,
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
                    className={styles.feedback}
                    id={feedbackId}
                    role="status"
                  >
                    <strong>Resposta registrada</strong>
                    <span>
                      A correção será calculada somente após a finalização do
                      simulado.
                    </span>
                  </div>
                ) : null}

                {clock.expired ? (
                  <p className={styles.timeWarning} role="status">
                    O tempo terminou. Estamos finalizando sua tentativa com as
                    respostas já salvas.
                  </p>
                ) : null}
                {answerError ? (
                  <p className={styles.error} role="alert">
                    {answerError}
                  </p>
                ) : null}
              </div>
            </article>

            <footer className={styles.runnerFooter}>
              <Button
                disabled={
                  currentIndex === 0 ||
                  isSubmitting ||
                  isSkipping ||
                  isFinishing
                }
                onClick={() => goToQuestion(currentIndex - 1)}
                variant="ghost"
              >
                ← Anterior
              </Button>

              <div className={styles.answerActions}>
                {!currentAnswer ? (
                  <>
                    <Button
                      disabled={isSubmitting || isFinishing || clock.expired}
                      loading={isSkipping}
                      loadingLabel="Pulando questão"
                      onClick={skipCurrentQuestion}
                      variant="ghost"
                    >
                      Pular questão
                    </Button>
                    <Button
                      disabled={
                        !selectedAnswer ||
                        isSkipping ||
                        isFinishing ||
                        clock.expired
                      }
                      loading={isSubmitting}
                      loadingLabel="Salvando resposta"
                      onClick={submitAnswer}
                    >
                      Confirmar resposta
                    </Button>
                  </>
                ) : (
                  <span className={styles.savedLabel}>Resposta salva</span>
                )}
              </div>

              <Button
                disabled={isSubmitting || isSkipping || isFinishing}
                onClick={goToNext}
                variant="secondary"
              >
                Próxima <span aria-hidden="true">→</span>
              </Button>
            </footer>
          </div>

          <aside className={styles.navigator} aria-label="Navegação do simulado">
            <div className={styles.navigatorTop}>
              <div>
                <p className={styles.eyebrow}>Mapa da prova</p>
                <h2>Navegação</h2>
              </div>
              <button
                aria-expanded={navigatorOpen}
                className={styles.navigatorToggle}
                onClick={() => setNavigatorOpen((current) => !current)}
                type="button"
              >
                {navigatorOpen ? "Ocultar questões" : "Ver questões"}
              </button>
            </div>

            <div
              className={[
                styles.clock,
                styles.clockTop,
                clockCritical && styles.clockCritical,
                clock.expired && styles.clockExpired,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>
                {clock.mode === "countdown"
                  ? "Tempo restante"
                  : "Tempo decorrido"}
              </span>
              <strong aria-live="off" role="timer">
                {formatSimulationTime(clock.seconds)}
              </strong>
              <small>
                {clock.mode === "countdown"
                  ? "A tentativa encerra automaticamente no zero."
                  : "Este simulado não possui limite configurado."}
              </small>
            </div>

            <div className={styles.attemptActions}>
              <Button
                disabled={
                  finished ||
                  isSubmitting ||
                  isSkipping ||
                  isFinishing ||
                  isPausing ||
                  clock.expired
                }
                fullWidth
                onClick={openPauseDialog}
                variant="secondary"
              >
                Fazer pausa
              </Button>
              <Button
                className={styles.finishButton}
                disabled={
                  finished ||
                  isSubmitting ||
                  isSkipping ||
                  isPausing ||
                  (clock.expired && !finishError)
                }
                fullWidth
                loading={isFinishing}
                loadingLabel={
                  finishTrigger === "timeout"
                    ? "Tempo esgotado, finalizando"
                    : "Finalizando simulado"
                }
                onClick={openFinishDialog}
                variant="danger"
              >
                {finished ? "Finalizado" : "Finalizar agora"}
              </Button>
            </div>

            <p className={styles.finishHint}>
              Questões sem resposta não são contabilizadas como erros.
            </p>

            {finishError ? (
              <p className={styles.sidebarError} role="alert">
                {finishError}
              </p>
            ) : null}

            <div
              className={[
                styles.navigatorBody,
                navigatorOpen && styles.navigatorBodyOpen,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <nav
                aria-label="Ir diretamente para uma questão"
                className={styles.questionGrid}
              >
                {sessionQuestions.map((question, index) => {
                  const answered = Boolean(answers[question.itemId]);
                  const skipped =
                    skippedItems.has(question.itemId) && !answered;
                  const current = index === currentIndex;
                  const questionClasses = [
                    styles.questionLink,
                    answered
                      ? styles.questionAnswered
                      : skipped
                        ? styles.questionSkipped
                        : styles.questionUnanswered,
                    current && styles.questionCurrent,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      aria-current={current ? "step" : undefined}
                      aria-label={navigationLabel({
                        number: question.position,
                        answered,
                        skipped,
                        current,
                      })}
                      className={questionClasses}
                      disabled={isSubmitting || isSkipping || isFinishing}
                      key={question.itemId}
                      onClick={() => goToQuestion(index)}
                      type="button"
                    >
                      {question.position}
                    </button>
                  );
                })}
              </nav>

              <div className={styles.legend} aria-label="Legenda">
                <strong>Legenda</strong>
                <span>
                  <i className={styles.legendAnswered} /> Respondida
                </span>
                <span>
                  <i className={styles.legendSkipped} /> Pulada
                </span>
                <span>
                  <i className={styles.legendUnanswered} /> Sem resposta
                </span>
              </div>
            </div>

          </aside>
        </div>
      </section>

      {showFinishConfirm ? (
        <div
          className={styles.dialogBackdrop}
          onMouseDown={(event) => {
            if (
              event.currentTarget === event.target &&
              !isFinishing &&
              !isConfirmingPending
            ) {
              setShowFinishConfirm(false);
            }
          }}
        >
          <div
            aria-describedby={`${idPrefix}-finish-description`}
            aria-labelledby={`${idPrefix}-finish-title`}
            aria-modal="true"
            className={styles.finishDialog}
            onKeyDown={handleFinishDialogKeyDown}
            ref={finishDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <p className={styles.eyebrow}>Encerrar tentativa</p>
            <h2 id={`${idPrefix}-finish-title`}>Finalizar agora?</h2>
            <p id={`${idPrefix}-finish-description`}>
              Depois de finalizar, as respostas não poderão ser alteradas e o
              resultado com acertos e erros será calculado.
            </p>

            <dl className={styles.finishSummary}>
              <div>
                <dt>Respondidas</dt>
                <dd>{answeredCount}</dd>
              </div>
              <div>
                <dt>Serão puladas</dt>
                <dd>{pendingAtFinish}</dd>
              </div>
              <div>
                <dt>Marcadas e pendentes</dt>
                <dd>{pendingSelectionCount}</dd>
              </div>
            </dl>

            <div className={styles.finishRule}>
              {pendingSelectionCount
                ? "Confirme as questões marcadas antes de finalizar para não perder essas respostas."
                : `As ${pendingAtFinish} questões sem resposta ficarão fora da contagem de acertos e erros.`}
            </div>

            {dialogError ? (
              <p className={styles.dialogError} role="alert">
                {dialogError}
              </p>
            ) : null}

            {pendingSelectionCount ? (
              <div className={styles.pendingAction}>
                <Button
                  fullWidth
                  loading={isConfirmingPending}
                  loadingLabel="Confirmando questões pendentes"
                  onClick={() => {
                    void confirmPendingAnswers();
                  }}
                  variant="primary"
                >
                  Confirmar questões pendentes ({pendingSelectionCount})
                </Button>
              </div>
            ) : null}

            <div className={styles.dialogActions}>
              <Button
                disabled={isFinishing || isConfirmingPending}
                onClick={() => setShowFinishConfirm(false)}
                variant="secondary"
              >
                Continuar respondendo
              </Button>
              <Button
                disabled={pendingSelectionCount > 0 || isConfirmingPending}
                loading={isFinishing}
                loadingLabel="Finalizando simulado"
                onClick={() => {
                  void finishSimulation("manual");
                }}
                variant="danger"
              >
                Finalizar e ver resultado
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showPauseConfirm ? (
        <div
          className={styles.dialogBackdrop}
          onMouseDown={(event) => {
            if (
              event.currentTarget === event.target &&
              !isPausing &&
              !isConfirmingPending
            ) {
              setShowPauseConfirm(false);
            }
          }}
        >
          <div
            aria-describedby={`${idPrefix}-pause-description`}
            aria-labelledby={`${idPrefix}-pause-title`}
            aria-modal="true"
            className={styles.finishDialog}
            onKeyDown={handlePauseDialogKeyDown}
            ref={pauseDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <p className={styles.eyebrow}>Pausar tentativa</p>
            <h2 id={`${idPrefix}-pause-title`}>Fazer uma pausa?</h2>
            <p id={`${idPrefix}-pause-description`}>
              O cronômetro será congelado em{" "}
              <strong>{formatSimulationTime(clock.seconds)}</strong>. Ao
              retornar, você continuará deste mesmo ponto.
            </p>

            <dl className={styles.finishSummary}>
              <div>
                <dt>Respondidas</dt>
                <dd>{answeredCount}</dd>
              </div>
              <div>
                <dt>Marcadas e pendentes</dt>
                <dd>{pendingSelectionCount}</dd>
              </div>
            </dl>

            <div className={styles.finishRule}>
              {pendingSelectionCount
                ? "Há questões marcadas que ainda não foram salvas. Confirme-as antes de pausar."
                : "Todas as respostas confirmadas já estão salvas. Você poderá retomar quando quiser."}
            </div>

            {dialogError ? (
              <p className={styles.dialogError} role="alert">
                {dialogError}
              </p>
            ) : null}

            {pendingSelectionCount ? (
              <div className={styles.pendingAction}>
                <Button
                  fullWidth
                  loading={isConfirmingPending}
                  loadingLabel="Confirmando questões pendentes"
                  onClick={() => {
                    void confirmPendingAnswers();
                  }}
                >
                  Confirmar questões pendentes ({pendingSelectionCount})
                </Button>
              </div>
            ) : null}

            <div className={styles.dialogActions}>
              <Button
                disabled={isPausing || isConfirmingPending}
                onClick={() => setShowPauseConfirm(false)}
                variant="secondary"
              >
                Continuar respondendo
              </Button>
              <Button
                disabled={pendingSelectionCount > 0 || isConfirmingPending}
                loading={isPausing}
                loadingLabel="Pausando simulado"
                onClick={() => {
                  void pauseSimulation();
                }}
              >
                Pausar e sair
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
