import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { SimulationQuestion as RunnerQuestion } from "@/components/study";
import { getDb } from "@/db";
import {
  exams,
  questions,
  simulationAnswers,
  simulationAttemptQuestions,
  simulationAttempts,
  simulationQuestions,
  simulations,
  subjects,
  type AttemptQuestionSnapshot,
} from "@/db/schema";
import { canAccessSimulation, type ResolvedAccess } from "@/lib/access";
import { calculateSimulationScore } from "@/lib/simulation-attempt";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

function optionsForRunner(options: Record<string, string>) {
  return OPTION_LABELS.flatMap((label) => {
    const text = options[label];
    return text ? [{ label, text }] : [];
  });
}

export async function listAvailableSimulations(userId: string, access: ResolvedAccess) {
  const database = getDb();
  const [catalog, attempts] = await Promise.all([
    database
      .select({
        id: simulations.id,
        slug: simulations.slug,
        title: simulations.title,
        description: simulations.description,
        access: simulations.access,
        durationMinutes: simulations.durationMinutes,
      })
      .from(simulations)
      .where(and(eq(simulations.status, "PUBLISHED"), isNull(simulations.deletedAt)))
      .orderBy(asc(simulations.access), desc(simulations.publishedAt), simulations.title),
    database
      .select({
        id: simulationAttempts.id,
        simulationId: simulationAttempts.simulationId,
        status: simulationAttempts.status,
        totalQuestions: simulationAttempts.totalQuestions,
        correctAnswers: simulationAttempts.correctAnswers,
        startedAt: simulationAttempts.startedAt,
        submittedAt: simulationAttempts.submittedAt,
        pausedAt: simulationAttempts.pausedAt,
        freeAccessClaim: simulationAttempts.freeAccessClaim,
      })
      .from(simulationAttempts)
      .where(eq(simulationAttempts.userId, userId))
      .orderBy(desc(simulationAttempts.startedAt)),
  ]);

  const latestBySimulation = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    if (!latestBySimulation.has(attempt.simulationId)) {
      latestBySimulation.set(attempt.simulationId, attempt);
    }
  }
  const claimedFreeAttempt =
    attempts.find((attempt) => attempt.freeAccessClaim) ?? null;
  const currentFreeAttempt = claimedFreeAttempt
    ? latestBySimulation.get(claimedFreeAttempt.simulationId) ??
      claimedFreeAttempt
    : null;

  return {
    simulations: catalog.map((simulation) => ({
      ...simulation,
      available: canAccessSimulation(access, simulation.access),
      latestAttempt: latestBySimulation.get(simulation.id) ?? null,
    })),
    freeAttempt: currentFreeAttempt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  return candidate.code === "23505" || isUniqueViolation(candidate.cause);
}

export async function createSimulationAttempt(input: {
  userId: string;
  simulationId: string;
  clientRequestId: string;
  replacePreviousResult?: boolean;
  access: ResolvedAccess;
}) {
  const database = getDb();
  const simulationRows = await database
    .select()
    .from(simulations)
    .where(
      and(
        eq(simulations.id, input.simulationId),
        eq(simulations.status, "PUBLISHED"),
        isNull(simulations.deletedAt),
      ),
    )
    .limit(1);
  const simulation = simulationRows[0];

  if (!simulation) throw new Error("Simulado não encontrado.");
  if (!canAccessSimulation(input.access, simulation.access)) {
    throw new Error("Este simulado exige acesso completo.");
  }

  const latestAttemptRows = await database
    .select({
      id: simulationAttempts.id,
      status: simulationAttempts.status,
    })
    .from(simulationAttempts)
    .where(
      and(
        eq(simulationAttempts.userId, input.userId),
        eq(simulationAttempts.simulationId, simulation.id),
      ),
    )
    .orderBy(desc(simulationAttempts.startedAt), desc(simulationAttempts.id))
    .limit(1);
  const latestAttempt = latestAttemptRows[0];

  if (latestAttempt?.status === "IN_PROGRESS") {
    return latestAttempt.id;
  }
  if (
    latestAttempt?.status === "SUBMITTED" &&
    !input.replacePreviousResult
  ) {
    throw new Error(
      "Confirme que deseja sobrepor o último resultado deste simulado.",
    );
  }

  let existingFreeAttempt:
    | { id: string; simulationId: string }
    | undefined;
  if (!input.access.hasFullAccess) {
    const existingFree = await database
      .select({
        id: simulationAttempts.id,
        simulationId: simulationAttempts.simulationId,
      })
      .from(simulationAttempts)
      .where(
        and(
          eq(simulationAttempts.userId, input.userId),
          eq(simulationAttempts.freeAccessClaim, true),
        ),
      )
      .orderBy(desc(simulationAttempts.startedAt))
      .limit(1);
    existingFreeAttempt = existingFree[0];
    if (
      existingFreeAttempt &&
      existingFreeAttempt.simulationId !== simulation.id
    ) {
      throw new Error("Este simulado exige acesso completo.");
    }
  }
  const consumesFreeAccess =
    !input.access.hasFullAccess && !existingFreeAttempt;

  const sourceQuestions = await database
    .select({
      questionId: questions.id,
      position: simulationQuestions.position,
      externalId: questions.externalId,
      examId: questions.examId,
      subjectId: questions.subjectId,
      number: questions.number,
      statement: questions.statement,
      options: questions.options,
      annulled: questions.annulled,
      version: questions.version,
      correctAnswer: questions.correctAnswer,
    })
    .from(simulationQuestions)
    .innerJoin(questions, eq(questions.id, simulationQuestions.questionId))
    .where(
      and(
        eq(simulationQuestions.simulationId, simulation.id),
        eq(questions.status, "PUBLISHED"),
        isNull(questions.deletedAt),
      ),
    )
    .orderBy(simulationQuestions.position);

  if (!sourceQuestions.length) {
    throw new Error("Este simulado ainda não possui questões publicadas.");
  }

  const attemptId = crypto.randomUUID();
  const startedAt = new Date();
  const expiresAt = simulation.durationMinutes
    ? new Date(startedAt.getTime() + simulation.durationMinutes * 60_000)
    : null;
  const attemptQuestionRows = sourceQuestions.map((question) => {
    const snapshot: AttemptQuestionSnapshot = {
      externalId: question.externalId,
      examId: question.examId,
      subjectId: question.subjectId,
      number: question.number,
      statement: question.statement,
      options: question.options,
      annulled: question.annulled,
      version: question.version,
    };

    return {
      id: crypto.randomUUID(),
      attemptId,
      questionId: question.questionId,
      position: question.position,
      snapshot,
      correctAnswerSnapshot: question.correctAnswer,
    };
  });

  try {
    await database.batch([
      database.insert(simulationAttempts).values({
        id: attemptId,
        userId: input.userId,
        simulationId: simulation.id,
        freeAccessClaim: consumesFreeAccess,
        totalQuestions: attemptQuestionRows.length,
        clientRequestId: input.clientRequestId,
        startedAt,
        expiresAt,
      }),
      database.insert(simulationAttemptQuestions).values(attemptQuestionRows),
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await database
        .select({ id: simulationAttempts.id })
        .from(simulationAttempts)
        .where(
          and(
            eq(simulationAttempts.userId, input.userId),
            consumesFreeAccess
              ? eq(simulationAttempts.freeAccessClaim, true)
              : eq(simulationAttempts.clientRequestId, input.clientRequestId),
          ),
        )
        .limit(1);
      if (existing[0]) return existing[0].id;
    }
    throw error;
  }

  return attemptId;
}

export async function getAttemptForRunner(userId: string, attemptId: string) {
  const database = getDb();
  const attemptRows = await database
    .select({
      id: simulationAttempts.id,
      status: simulationAttempts.status,
      totalQuestions: simulationAttempts.totalQuestions,
      correctAnswers: simulationAttempts.correctAnswers,
      startedAt: simulationAttempts.startedAt,
      expiresAt: simulationAttempts.expiresAt,
      submittedAt: simulationAttempts.submittedAt,
      pausedAt: simulationAttempts.pausedAt,
      pausedClockSeconds: simulationAttempts.pausedClockSeconds,
      title: simulations.title,
    })
    .from(simulationAttempts)
    .innerJoin(simulations, eq(simulations.id, simulationAttempts.simulationId))
    .where(
      and(eq(simulationAttempts.id, attemptId), eq(simulationAttempts.userId, userId)),
    )
    .limit(1);

  const attempt = attemptRows[0];
  if (!attempt) return null;

  const rows = await database
    .select({
      itemId: simulationAttemptQuestions.id,
      position: simulationAttemptQuestions.position,
      snapshot: simulationAttemptQuestions.snapshot,
      correctAnswer: simulationAttemptQuestions.correctAnswerSnapshot,
      skippedAt: simulationAttemptQuestions.skippedAt,
      selectedAnswer: simulationAnswers.selectedAnswer,
      isCorrect: simulationAnswers.isCorrect,
      subject: subjects.name,
      examTitle: exams.title,
    })
    .from(simulationAttemptQuestions)
    .innerJoin(questions, eq(questions.id, simulationAttemptQuestions.questionId))
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .innerJoin(exams, eq(exams.id, questions.examId))
    .leftJoin(
      simulationAnswers,
      eq(simulationAnswers.attemptQuestionId, simulationAttemptQuestions.id),
    )
    .where(eq(simulationAttemptQuestions.attemptId, attemptId))
    .orderBy(simulationAttemptQuestions.position);

  const runnerQuestions: RunnerQuestion[] = rows.map((row) => ({
    itemId: row.itemId,
    position: row.position,
    subject: row.subject,
    examLabel: row.examTitle,
    stem: row.snapshot.statement,
    options: optionsForRunner(row.snapshot.options),
    skipped: Boolean(row.skippedAt && !row.selectedAnswer),
    existingAnswer: row.selectedAnswer
      ? {
          selectedAnswer: row.selectedAnswer as "A" | "B" | "C" | "D",
          correctAnswer:
            attempt.status === "SUBMITTED"
              ? (row.correctAnswer as "A" | "B" | "C" | "D" | null)
              : null,
          isCorrect: attempt.status === "SUBMITTED" ? row.isCorrect : null,
          annulled: attempt.status === "SUBMITTED" && row.snapshot.annulled,
        }
      : undefined,
  }));

  return { attempt, questions: runnerQuestions };
}

export async function getAttemptResult(userId: string, attemptId: string) {
  const data = await getAttemptForRunner(userId, attemptId);
  if (!data) return null;

  const answered = data.questions.flatMap((question) =>
    question.existingAnswer
      ? [
          {
            isCorrect: question.existingAnswer.isCorrect,
            annulled: question.existingAnswer.annulled,
          },
        ]
      : [],
  );
  const score = calculateSimulationScore(data.attempt.totalQuestions, answered);
  return {
    ...data.attempt,
    ...score,
  };
}

export async function findAttemptItem(input: {
  userId: string;
  attemptId: string;
  itemId: string;
}) {
  const rows = await getDb()
    .select({
      itemId: simulationAttemptQuestions.id,
      snapshot: simulationAttemptQuestions.snapshot,
      correctAnswer: simulationAttemptQuestions.correctAnswerSnapshot,
      status: simulationAttempts.status,
      totalQuestions: simulationAttempts.totalQuestions,
      expiresAt: simulationAttempts.expiresAt,
      pausedAt: simulationAttempts.pausedAt,
    })
    .from(simulationAttemptQuestions)
    .innerJoin(
      simulationAttempts,
      eq(simulationAttempts.id, simulationAttemptQuestions.attemptId),
    )
    .where(
      and(
        eq(simulationAttemptQuestions.id, input.itemId),
        eq(simulationAttemptQuestions.attemptId, input.attemptId),
        eq(simulationAttempts.userId, input.userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function finalizeSimulationAttemptForUser(input: {
  userId: string;
  attemptId: string;
}) {
  const database = getDb();
  const [lockedAttempts, submittedAttempts] = await database.batch([
    database
      .select({
        id: simulationAttempts.id,
        status: simulationAttempts.status,
      })
      .from(simulationAttempts)
      .where(
        and(
          eq(simulationAttempts.id, input.attemptId),
          eq(simulationAttempts.userId, input.userId),
        ),
      )
      .for("update"),
    database
      .update(simulationAttempts)
      .set({
        status: "SUBMITTED",
        correctAnswers: sql<number>`(
          select count(*)::integer
          from ${simulationAnswers}
          inner join ${simulationAttemptQuestions}
            on ${simulationAttemptQuestions.id} = ${simulationAnswers.attemptQuestionId}
          where ${simulationAttemptQuestions.attemptId} = ${input.attemptId}
            and ${simulationAnswers.isCorrect} = true
            and coalesce(
              ((${simulationAttemptQuestions.snapshot} ->> 'annulled')::boolean),
              false
            ) = false
        )`,
        submittedAt: new Date(),
      })
      .where(
        and(
          eq(simulationAttempts.id, input.attemptId),
          eq(simulationAttempts.userId, input.userId),
          eq(simulationAttempts.status, "IN_PROGRESS"),
          isNull(simulationAttempts.pausedAt),
        ),
      )
      .returning({ id: simulationAttempts.id }),
  ]);
  const lockedAttempt = lockedAttempts[0];

  if (!lockedAttempt) {
    return { ok: false as const, reason: "NOT_FOUND" as const };
  }
  if (lockedAttempt.status === "SUBMITTED") {
    return { ok: true as const, attemptId: lockedAttempt.id };
  }
  if (lockedAttempt.status !== "IN_PROGRESS" || !submittedAttempts[0]) {
    return { ok: false as const, reason: "INVALID_STATUS" as const };
  }

  return { ok: true as const, attemptId: lockedAttempt.id };
}

export async function pauseSimulationAttemptForUser(input: {
  userId: string;
  attemptId: string;
}) {
  const pausedAttempts = await getDb()
    .update(simulationAttempts)
    .set({
      pausedAt: sql<Date>`current_timestamp`,
      pausedClockSeconds: sql<number>`
        case
          when ${simulationAttempts.expiresAt} is not null then
            greatest(
              0,
              ceil(
                extract(
                  epoch from (
                    ${simulationAttempts.expiresAt} - current_timestamp
                  )
                )
              )::integer
            )
          else
            greatest(
              0,
              floor(
                extract(
                  epoch from (
                    current_timestamp - ${simulationAttempts.startedAt}
                  )
                )
              )::integer
            )
        end
      `,
    })
    .where(
      and(
        eq(simulationAttempts.id, input.attemptId),
        eq(simulationAttempts.userId, input.userId),
        eq(simulationAttempts.status, "IN_PROGRESS"),
        isNull(simulationAttempts.pausedAt),
        sql`(
          ${simulationAttempts.expiresAt} is null
          or ${simulationAttempts.expiresAt} > current_timestamp
        )`,
      ),
    )
    .returning({
      id: simulationAttempts.id,
      pausedClockSeconds: simulationAttempts.pausedClockSeconds,
    });

  const paused = pausedAttempts[0];
  return paused
    ? {
        ok: true as const,
        attemptId: paused.id,
        clockSeconds: paused.pausedClockSeconds ?? 0,
      }
    : { ok: false as const, reason: "NOT_PAUSABLE" as const };
}

export async function resumeSimulationAttemptForUser(input: {
  userId: string;
  attemptId: string;
}) {
  const resumedAttempts = await getDb()
    .update(simulationAttempts)
    .set({
      startedAt: sql<Date>`
        case
          when ${simulationAttempts.expiresAt} is null then
            current_timestamp - make_interval(
              secs => ${simulationAttempts.pausedClockSeconds}
            )
          else ${simulationAttempts.startedAt}
        end
      `,
      expiresAt: sql<Date | null>`
        case
          when ${simulationAttempts.expiresAt} is not null then
            current_timestamp + make_interval(
              secs => ${simulationAttempts.pausedClockSeconds}
            )
          else null
        end
      `,
      pausedAt: null,
      pausedClockSeconds: null,
    })
    .where(
      and(
        eq(simulationAttempts.id, input.attemptId),
        eq(simulationAttempts.userId, input.userId),
        eq(simulationAttempts.status, "IN_PROGRESS"),
        sql`${simulationAttempts.pausedAt} is not null`,
        sql`${simulationAttempts.pausedClockSeconds} is not null`,
      ),
    )
    .returning({ id: simulationAttempts.id });

  return resumedAttempts[0]
    ? { ok: true as const, attemptId: resumedAttempts[0].id }
    : { ok: false as const, reason: "NOT_PAUSED" as const };
}

export async function getAttemptsByIds(userId: string, ids: string[]) {
  if (!ids.length) return [];
  return getDb()
    .select()
    .from(simulationAttempts)
    .where(and(eq(simulationAttempts.userId, userId), inArray(simulationAttempts.id, ids)));
}
