import { count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  questions,
  simulationAnswers,
  simulationAttemptQuestions,
  simulationAttempts,
  simulations,
  subjects,
} from "@/db/schema";

export type DashboardSummary = {
  attempts: number;
  completedAttempts: number;
  answeredQuestions: number;
  scoredQuestions: number;
  correctAnswers: number;
  accuracy: number;
};

export async function getDashboardData(userId: string, includeAdvanced = false) {
  const database = getDb();
  const latestAttemptPerSimulation = database
    .selectDistinctOn([simulationAttempts.simulationId], {
      id: simulationAttempts.id,
      simulationId: simulationAttempts.simulationId,
      title: simulations.title,
      status: simulationAttempts.status,
      totalQuestions: simulationAttempts.totalQuestions,
      correctAnswers: simulationAttempts.correctAnswers,
      startedAt: simulationAttempts.startedAt,
      submittedAt: simulationAttempts.submittedAt,
      pausedAt: simulationAttempts.pausedAt,
    })
    .from(simulationAttempts)
    .innerJoin(simulations, eq(simulations.id, simulationAttempts.simulationId))
    .where(eq(simulationAttempts.userId, userId))
    .orderBy(
      simulationAttempts.simulationId,
      desc(simulationAttempts.startedAt),
      desc(simulationAttempts.id),
    )
    .as("latest_attempt_per_simulation");

  const [attemptTotals, answerTotals, recentAttempts, subjectPerformance] = await Promise.all([
    database
      .select({
        attempts: count(),
        completed: sql<number>`
          count(distinct ${simulationAttempts.simulationId})
          filter (where ${simulationAttempts.status} = 'SUBMITTED')
        `,
      })
      .from(simulationAttempts)
      .where(eq(simulationAttempts.userId, userId)),
    database
      .select({
        answered: count(simulationAnswers.attemptQuestionId),
        correct: sql<number>`
          count(*) filter (
            where ${simulationAnswers.isCorrect} = true
              and coalesce(
                ((${simulationAttemptQuestions.snapshot} ->> 'annulled')::boolean),
                false
              ) = false
          )
        `,
        annulled: sql<number>`
          count(*) filter (
            where coalesce(
              ((${simulationAttemptQuestions.snapshot} ->> 'annulled')::boolean),
              false
            ) = true
          )
        `,
      })
      .from(simulationAnswers)
      .innerJoin(
        simulationAttemptQuestions,
        eq(simulationAttemptQuestions.id, simulationAnswers.attemptQuestionId),
      )
      .innerJoin(
        simulationAttempts,
        eq(simulationAttempts.id, simulationAttemptQuestions.attemptId),
      )
      .where(eq(simulationAttempts.userId, userId)),
    database
      .select({
        id: latestAttemptPerSimulation.id,
        title: latestAttemptPerSimulation.title,
        status: latestAttemptPerSimulation.status,
        totalQuestions: latestAttemptPerSimulation.totalQuestions,
        correctAnswers: latestAttemptPerSimulation.correctAnswers,
        startedAt: latestAttemptPerSimulation.startedAt,
        submittedAt: latestAttemptPerSimulation.submittedAt,
        pausedAt: latestAttemptPerSimulation.pausedAt,
      })
      .from(latestAttemptPerSimulation)
      .orderBy(desc(latestAttemptPerSimulation.startedAt))
      .limit(5),
    includeAdvanced
      ? database
          .select({
            subject: subjects.name,
            answered: count(simulationAnswers.attemptQuestionId),
            correct: sql<number>`
              count(*) filter (
                where ${simulationAnswers.isCorrect} = true
                  and coalesce(
                    ((${simulationAttemptQuestions.snapshot} ->> 'annulled')::boolean),
                    false
                  ) = false
              )
            `,
            annulled: sql<number>`
              count(*) filter (
                where coalesce(
                  ((${simulationAttemptQuestions.snapshot} ->> 'annulled')::boolean),
                  false
                ) = true
              )
            `,
          })
          .from(simulationAnswers)
          .innerJoin(
            simulationAttemptQuestions,
            eq(simulationAttemptQuestions.id, simulationAnswers.attemptQuestionId),
          )
          .innerJoin(
            simulationAttempts,
            eq(simulationAttempts.id, simulationAttemptQuestions.attemptId),
          )
          .innerJoin(questions, eq(questions.id, simulationAttemptQuestions.questionId))
          .innerJoin(subjects, eq(subjects.id, questions.subjectId))
          .where(eq(simulationAttempts.userId, userId))
          .groupBy(subjects.id, subjects.name)
          .orderBy(desc(count(simulationAnswers.attemptQuestionId)))
      : Promise.resolve([]),
  ]);

  const attempts = Number(attemptTotals[0]?.attempts ?? 0);
  const completedAttempts = Number(attemptTotals[0]?.completed ?? 0);
  const answeredQuestions = Number(answerTotals[0]?.answered ?? 0);
  const annulledQuestions = Number(answerTotals[0]?.annulled ?? 0);
  const scoredQuestions = Math.max(0, answeredQuestions - annulledQuestions);
  const correctAnswers = Number(answerTotals[0]?.correct ?? 0);

  const summary: DashboardSummary = {
    attempts,
    completedAttempts,
    answeredQuestions,
    scoredQuestions,
    correctAnswers,
    accuracy:
      scoredQuestions > 0
        ? Math.round((correctAnswers / scoredQuestions) * 100)
        : 0,
  };

  return {
    summary,
    recentAttempts,
    subjectPerformance: subjectPerformance.map((row) => {
      const answered = Number(row.answered);
      const annulled = Number(row.annulled);
      const scored = Math.max(0, answered - annulled);
      const correct = Number(row.correct);
      return {
        subject: row.subject,
        answered,
        scored,
        correct,
        accuracy: scored > 0 ? Math.round((correct / scored) * 100) : 0,
      };
    }),
  };
}
