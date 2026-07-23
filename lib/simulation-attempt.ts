export type SimulationScoreAnswer = {
  isCorrect: boolean | null;
  annulled?: boolean;
};

export type SimulationScore = {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  annulled: number;
  skipped: number;
  accuracy: number;
};

export function calculateSimulationScore(
  totalQuestions: number,
  answers: readonly SimulationScoreAnswer[],
): SimulationScore {
  const total = Math.max(0, Math.trunc(totalQuestions));
  const answered = Math.min(total, answers.length);
  const consideredAnswers = answers.slice(0, answered);
  const annulled = consideredAnswers.filter((answer) => answer.annulled).length;
  const correct = consideredAnswers.filter(
    (answer) => !answer.annulled && answer.isCorrect === true,
  ).length;
  const incorrect = consideredAnswers.filter(
    (answer) => !answer.annulled && answer.isCorrect === false,
  ).length;
  const scored = correct + incorrect;

  return {
    total,
    answered,
    correct,
    incorrect,
    annulled,
    skipped: Math.max(0, total - answered),
    accuracy: scored ? Math.round((correct / scored) * 100) : 0,
  };
}

type ClockInput = {
  startedAt: Date | string | number;
  expiresAt?: Date | string | number | null;
  now?: Date | string | number;
};

export type SimulationClock = {
  mode: "countdown" | "elapsed";
  seconds: number;
  expired: boolean;
};

function timestamp(value: Date | string | number) {
  const parsed =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getSimulationClock({
  startedAt,
  expiresAt,
  now = Date.now(),
}: ClockInput): SimulationClock {
  const nowTimestamp = timestamp(now) ?? Date.now();
  const expirationTimestamp =
    expiresAt === null || expiresAt === undefined ? null : timestamp(expiresAt);

  if (expirationTimestamp !== null) {
    const remainingMilliseconds = expirationTimestamp - nowTimestamp;
    return {
      mode: "countdown",
      seconds: Math.max(0, Math.ceil(remainingMilliseconds / 1000)),
      expired: remainingMilliseconds <= 0,
    };
  }

  const startedTimestamp = timestamp(startedAt) ?? nowTimestamp;
  return {
    mode: "elapsed",
    seconds: Math.max(0, Math.floor((nowTimestamp - startedTimestamp) / 1000)),
    expired: false,
  };
}

export function formatSimulationTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.trunc(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
