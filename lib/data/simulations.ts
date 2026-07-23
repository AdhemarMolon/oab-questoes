import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

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

  return {
    simulations: catalog.map((simulation) => ({
      ...simulation,
      available: canAccessSimulation(access, simulation.access),
      latestAttempt: latestBySimulation.get(simulation.id) ?? null,
    })),
    freeAttempt: attempts.find((attempt) => attempt.freeAccessClaim) ?? null,
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

  const consumesFreeAccess = !input.access.hasFullAccess;
  if (consumesFreeAccess) {
    const existingFree = await database
      .select({ id: simulationAttempts.id })
      .from(simulationAttempts)
      .where(
        and(
          eq(simulationAttempts.userId, input.userId),
          eq(simulationAttempts.freeAccessClaim, true),
        ),
      )
      .orderBy(desc(simulationAttempts.startedAt))
      .limit(1);
    if (existingFree[0]) return existingFree[0].id;
  }

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
      submittedAt: simulationAttempts.submittedAt,
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
    existingAnswer: row.selectedAnswer
      ? {
          selectedAnswer: row.selectedAnswer as "A" | "B" | "C" | "D",
          correctAnswer: row.correctAnswer as "A" | "B" | "C" | "D" | null,
          isCorrect: row.isCorrect,
          annulled: row.snapshot.annulled,
        }
      : undefined,
  }));

  return { attempt, questions: runnerQuestions };
}

export async function getAttemptResult(userId: string, attemptId: string) {
  const data = await getAttemptForRunner(userId, attemptId);
  if (!data) return null;

  const answered = data.questions.filter((question) => question.existingAnswer);
  const correct = answered.filter((question) => question.existingAnswer?.isCorrect).length;
  return {
    ...data.attempt,
    answered: answered.length,
    correct,
    accuracy: answered.length ? Math.round((correct / answered.length) * 100) : 0,
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

export async function getAttemptsByIds(userId: string, ids: string[]) {
  if (!ids.length) return [];
  return getDb()
    .select()
    .from(simulationAttempts)
    .where(and(eq(simulationAttempts.userId, userId), inArray(simulationAttempts.id, ids)));
}
