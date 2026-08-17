import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  dailyStudyCompletions,
  exams,
  favorites,
  questions,
  questionStudyStates,
  simulationAnswers,
  simulationAttemptQuestions,
  simulationAttempts,
  simulations,
  studyActivities,
  studyGoals,
  studyNotes,
  studyPlans,
  subjects,
} from "@/db/schema";
import { getBrasiliaDateKey } from "@/lib/daily-question";

const brasiliaFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

function dateKey(date: Date) {
  return brasiliaFormatter.format(date);
}

function addDays(key: string, days: number) {
  const date = new Date(`${key}T12:00:00-03:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function startOfWeekKey(today: string) {
  const date = new Date(`${today}T12:00:00-03:00`);
  const weekday = date.getUTCDay();
  return addDays(today, -(weekday === 0 ? 6 : weekday - 1));
}

function percentage(correct: number, total: number) {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

export async function listStudySubjects() {
  return getDb()
    .select({ id: subjects.id, name: subjects.name })
    .from(subjects)
    .where(eq(subjects.isActive, true))
    .orderBy(subjects.displayOrder, subjects.name);
}

export async function getStudyAnalytics(userId: string) {
  const database = getDb();
  const [answers, attempts] = await Promise.all([
    database
      .select({
        attemptId: simulationAttempts.id,
        questionId: questions.id,
        answeredAt: simulationAnswers.answeredAt,
        isCorrect: simulationAnswers.isCorrect,
        annulled: questions.annulled,
        subjectId: subjects.id,
        subject: subjects.name,
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
      .orderBy(asc(simulationAnswers.answeredAt)),
    database
      .select({
        id: simulationAttempts.id,
        title: simulations.title,
        status: simulationAttempts.status,
        totalQuestions: simulationAttempts.totalQuestions,
        correctAnswers: simulationAttempts.correctAnswers,
        startedAt: simulationAttempts.startedAt,
        submittedAt: simulationAttempts.submittedAt,
      })
      .from(simulationAttempts)
      .innerJoin(simulations, eq(simulations.id, simulationAttempts.simulationId))
      .where(eq(simulationAttempts.userId, userId))
      .orderBy(asc(simulationAttempts.startedAt)),
  ]);

  const scored = answers.filter((answer) => !answer.annulled);
  const correct = scored.filter((answer) => answer.isCorrect).length;
  const completed = attempts.filter(
    (attempt) => attempt.status === "SUBMITTED" && attempt.submittedAt,
  );
  const durationSeconds = completed.reduce((total, attempt) => {
    return total + Math.max(0, (attempt.submittedAt!.getTime() - attempt.startedAt.getTime()) / 1000);
  }, 0);

  const bySubject = new Map<string, { id: string; subject: string; total: number; correct: number }>();
  for (const answer of scored) {
    const current = bySubject.get(answer.subjectId) ?? {
      id: answer.subjectId,
      subject: answer.subject,
      total: 0,
      correct: 0,
    };
    current.total += 1;
    if (answer.isCorrect) current.correct += 1;
    bySubject.set(answer.subjectId, current);
  }
  const subjectPerformance = [...bySubject.values()]
    .map((item) => ({ ...item, incorrect: item.total - item.correct, accuracy: percentage(item.correct, item.total) }))
    .sort((a, b) => b.total - a.total || b.accuracy - a.accuracy);

  const dailyMap = new Map<string, { total: number; correct: number }>();
  for (const answer of scored) {
    const key = dateKey(answer.answeredAt);
    const current = dailyMap.get(key) ?? { total: 0, correct: 0 };
    current.total += 1;
    if (answer.isCorrect) current.correct += 1;
    dailyMap.set(key, current);
  }
  const today = getBrasiliaDateKey();
  const daily = Array.from({ length: 14 }, (_, index) => {
    const key = addDays(today, index - 13);
    const item = dailyMap.get(key) ?? { total: 0, correct: 0 };
    return {
      key,
      label: dayLabelFormatter.format(new Date(`${key}T12:00:00-03:00`)),
      ...item,
      accuracy: percentage(item.correct, item.total),
    };
  });

  const activeKeys = [...dailyMap.keys()].filter((key) => dailyMap.get(key)!.total > 0);
  let streak = 0;
  let cursor = today;
  if (!dailyMap.has(cursor)) cursor = addDays(cursor, -1);
  while (dailyMap.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const simulationHistory = completed.map((attempt) => {
    const score = attempt.correctAnswers ?? 0;
    const attemptAnswers = scored.filter((answer) => answer.attemptId === attempt.id);
    const attemptSubjects = new Map<string, { subject: string; total: number; correct: number }>();
    for (const answer of attemptAnswers) {
      const current = attemptSubjects.get(answer.subjectId) ?? { subject: answer.subject, total: 0, correct: 0 };
      current.total += 1;
      if (answer.isCorrect) current.correct += 1;
      attemptSubjects.set(answer.subjectId, current);
    }
    const durationMinutes = Math.max(1, Math.round((attempt.submittedAt!.getTime() - attempt.startedAt.getTime()) / 60000));
    return {
      id: attempt.id,
      title: attempt.title,
      date: attempt.submittedAt!,
      score,
      total: attempt.totalQuestions,
      accuracy: percentage(score, attempt.totalQuestions),
      answered: attemptAnswers.length,
      incorrect: attemptAnswers.filter((answer) => !answer.isCorrect).length,
      durationMinutes,
      averageQuestionSeconds: attemptAnswers.length ? Math.round((durationMinutes * 60) / attemptAnswers.length) : 0,
      subjects: [...attemptSubjects.values()].map((item) => ({ ...item, incorrect: item.total - item.correct, accuracy: percentage(item.correct, item.total) })).sort((a, b) => a.accuracy - b.accuracy),
    };
  });
  const averageSimulationScore = completed.length
    ? Math.round(completed.reduce((sum, attempt) => sum + (attempt.correctAnswers ?? 0), 0) / completed.length)
    : 0;

  function rangeStats(from: string, to = today) {
    const range = scored.filter((answer) => {
      const key = dateKey(answer.answeredAt);
      return key >= from && key <= to;
    });
    return {
      total: range.length,
      correct: range.filter((answer) => answer.isCorrect).length,
      accuracy: percentage(range.filter((answer) => answer.isCorrect).length, range.length),
    };
  }

  const thisWeekStart = startOfWeekKey(today);
  const previousWeekStart = addDays(thisWeekStart, -7);
  const previousWeekEnd = addDays(thisWeekStart, -1);
  const monthStart = `${today.slice(0, 7)}-01`;

  return {
    summary: {
      answered: answers.length,
      scored: scored.length,
      correct,
      incorrect: scored.length - correct,
      accuracy: percentage(correct, scored.length),
      completedSimulations: completed.length,
      averageSimulationScore,
      bestSimulationScore: Math.max(0, ...completed.map((attempt) => attempt.correctAnswers ?? 0)),
      averageQuestionSeconds: answers.length ? Math.round(durationSeconds / answers.length) : 0,
      streak,
      studyDays: activeKeys.length,
    },
    daily,
    weekly: rangeStats(thisWeekStart),
    previousWeek: rangeStats(previousWeekStart, previousWeekEnd),
    monthly: rangeStats(monthStart),
    subjectPerformance,
    simulationHistory,
  };
}

export async function getPlannerData(userId: string, week?: string) {
  const today = getBrasiliaDateKey();
  const weekStart = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? startOfWeekKey(week) : startOfWeekKey(today);
  const weekEnd = addDays(weekStart, 7);
  const activities = await getDb()
    .select({
      id: studyActivities.id,
      title: studyActivities.title,
      description: studyActivities.description,
      type: studyActivities.type,
      scheduledAt: studyActivities.scheduledAt,
      estimatedMinutes: studyActivities.estimatedMinutes,
      targetQuestions: studyActivities.targetQuestions,
      completedAt: studyActivities.completedAt,
      subjectId: studyActivities.subjectId,
      subject: subjects.name,
    })
    .from(studyActivities)
    .leftJoin(subjects, eq(subjects.id, studyActivities.subjectId))
    .where(
      and(
        eq(studyActivities.userId, userId),
        sql`${studyActivities.scheduledAt} >= ${new Date(`${weekStart}T00:00:00-03:00`)}`,
        sql`${studyActivities.scheduledAt} < ${new Date(`${weekEnd}T00:00:00-03:00`)}`,
      ),
    )
    .orderBy(studyActivities.scheduledAt);
  const completed = activities.filter((activity) => activity.completedAt).length;
  return {
    weekStart,
    previousWeek: addDays(weekStart, -7),
    nextWeek: addDays(weekStart, 7),
    days: Array.from({ length: 7 }, (_, index) => {
      const key = addDays(weekStart, index);
      return {
        key,
        label: dayLabelFormatter.format(new Date(`${key}T12:00:00-03:00`)),
        activities: activities.filter((activity) => dateKey(activity.scheduledAt) === key),
      };
    }),
    completion: percentage(completed, activities.length),
    completed,
    total: activities.length,
    pending: activities.length - completed,
  };
}

export async function getGoalsData(userId: string) {
  const [goals, analytics, activities] = await Promise.all([
    getDb().select().from(studyGoals).where(eq(studyGoals.userId, userId)).orderBy(desc(studyGoals.createdAt)),
    getStudyAnalytics(userId),
    getDb().select({ completedAt: studyActivities.completedAt, estimatedMinutes: studyActivities.estimatedMinutes }).from(studyActivities).where(and(eq(studyActivities.userId, userId), sql`${studyActivities.completedAt} is not null`)),
  ]);
  return goals.map((goal) => {
    let current = 0;
    if (goal.metric === "QUESTIONS") {
      current = goal.period === "DAILY" ? analytics.daily.at(-1)?.total ?? 0 : goal.period === "MONTHLY" ? analytics.monthly.total : goal.period === "WEEKLY" ? analytics.weekly.total : analytics.summary.answered;
    } else if (goal.metric === "SIMULATIONS") {
      const today = getBrasiliaDateKey();
      const start = goal.period === "DAILY" ? today : goal.period === "MONTHLY" ? `${today.slice(0, 7)}-01` : goal.period === "WEEKLY" ? startOfWeekKey(today) : dateKey(goal.startsAt);
      current = analytics.simulationHistory.filter((attempt) => dateKey(attempt.date) >= start).length;
    } else if (goal.metric === "ACCURACY") {
      current = analytics.summary.accuracy;
    } else if (goal.metric === "SIMULATION_SCORE") {
      current = analytics.summary.averageSimulationScore;
    } else if (goal.metric === "STUDY_MINUTES") {
      const today = getBrasiliaDateKey();
      const start = goal.period === "DAILY" ? today : goal.period === "MONTHLY" ? `${today.slice(0, 7)}-01` : goal.period === "WEEKLY" ? startOfWeekKey(today) : dateKey(goal.startsAt);
      current = activities.filter((activity) => activity.completedAt && dateKey(activity.completedAt) >= start).reduce((sum, activity) => sum + (activity.estimatedMinutes ?? 0), 0);
    } else {
      current = 0;
    }
    return { ...goal, current, progress: Math.min(100, percentage(current, goal.targetValue)) };
  });
}

export async function getErrorNotebook(userId: string) {
  const database = getDb();
  const rows = await database
    .select({
      questionId: questions.id,
      externalId: questions.externalId,
      number: questions.number,
      statement: questions.statement,
      options: questions.options,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      subjectId: subjects.id,
      subject: subjects.name,
      examId: exams.id,
      exam: exams.title,
      year: exams.year,
      answeredAt: simulationAnswers.answeredAt,
      isCorrect: simulationAnswers.isCorrect,
      reviewedAt: questionStudyStates.reviewedAt,
      nextReviewAt: questionStudyStates.nextReviewAt,
      reviewCycleDays: questionStudyStates.reviewCycleDays,
      errorNote: questionStudyStates.errorNote,
      removedAt: questionStudyStates.removedFromErrorsAt,
    })
    .from(simulationAnswers)
    .innerJoin(simulationAttemptQuestions, eq(simulationAttemptQuestions.id, simulationAnswers.attemptQuestionId))
    .innerJoin(simulationAttempts, eq(simulationAttempts.id, simulationAttemptQuestions.attemptId))
    .innerJoin(questions, eq(questions.id, simulationAttemptQuestions.questionId))
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .innerJoin(exams, eq(exams.id, questions.examId))
    .leftJoin(
      questionStudyStates,
      and(eq(questionStudyStates.userId, userId), eq(questionStudyStates.questionId, questions.id)),
    )
    .where(and(eq(simulationAttempts.userId, userId), eq(questions.annulled, false)))
    .orderBy(desc(simulationAnswers.answeredAt));

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) grouped.set(row.questionId, [...(grouped.get(row.questionId) ?? []), row]);
  const items = [...grouped.values()]
    .filter((history) => history.some((answer) => !answer.isCorrect))
    .map((history) => {
      const latest = history[0];
      const firstWrong = [...history].reverse().find((answer) => !answer.isCorrect)!;
      const recovered = history.some((answer) => answer.isCorrect && answer.answeredAt > firstWrong.answeredAt);
      return { ...latest, firstWrongAt: firstWrong.answeredAt, recovered, attempts: history.length };
    })
    .filter((item) => !item.removedAt);
  const bySubject = new Map<string, number>();
  items.forEach((item) => bySubject.set(item.subject, (bySubject.get(item.subject) ?? 0) + 1));
  return {
    items,
    bySubject: [...bySubject.entries()].map(([subject, errors]) => ({ subject, errors })).sort((a, b) => b.errors - a.errors),
    recovery: percentage(items.filter((item) => item.recovered).length, items.length),
  };
}

export async function getReviews(userId: string) {
  const notebook = await getErrorNotebook(userId);
  const now = new Date();
  const pending = notebook.items.filter((item) => !item.nextReviewAt || item.nextReviewAt <= now);
  return { ...notebook, pending, today: getBrasiliaDateKey() };
}

export async function getNotes(userId: string, filters: { query?: string; subjectId?: string } = {}) {
  const rows = await getDb()
    .select({
      id: studyNotes.id,
      title: studyNotes.title,
      content: studyNotes.content,
      tags: studyNotes.tags,
      isFavorite: studyNotes.isFavorite,
      subjectId: studyNotes.subjectId,
      subject: subjects.name,
      questionId: studyNotes.questionId,
      updatedAt: studyNotes.updatedAt,
    })
    .from(studyNotes)
    .leftJoin(subjects, eq(subjects.id, studyNotes.subjectId))
    .where(eq(studyNotes.userId, userId))
    .orderBy(desc(studyNotes.isFavorite), desc(studyNotes.updatedAt));
  const query = filters.query?.trim().toLocaleLowerCase("pt-BR");
  return rows.filter((note) => {
    if (filters.subjectId && note.subjectId !== filters.subjectId) return false;
    if (!query) return true;
    return `${note.title} ${note.content} ${note.tags.join(" ")}`.toLocaleLowerCase("pt-BR").includes(query);
  });
}

export async function getFavoriteQuestions(userId: string) {
  return getDb()
    .select({
      id: questions.id,
      externalId: questions.externalId,
      number: questions.number,
      statement: questions.statement,
      subjectId: subjects.id,
      subject: subjects.name,
      examId: exams.id,
      exam: exams.title,
      year: exams.year,
      status: questions.status,
      createdAt: favorites.createdAt,
    })
    .from(favorites)
    .innerJoin(questions, eq(questions.id, favorites.questionId))
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .innerJoin(exams, eq(exams.id, questions.examId))
    .where(and(eq(favorites.userId, userId), isNull(questions.deletedAt)))
    .orderBy(desc(favorites.createdAt));
}

export async function getTodayStudy(userId: string) {
  const today = getBrasiliaDateKey();
  const [analytics, reviews, goals, planner, completions, plan] = await Promise.all([
    getStudyAnalytics(userId),
    getReviews(userId),
    getGoalsData(userId),
    getPlannerData(userId, today),
    getDb().select({ itemKey: dailyStudyCompletions.itemKey }).from(dailyStudyCompletions).where(and(eq(dailyStudyCompletions.userId, userId), eq(dailyStudyCompletions.dateKey, today))),
    getStudyPlan(userId),
  ]);
  const completedKeys = new Set(completions.map((item) => item.itemKey));
  const weakest = analytics.subjectPerformance.slice().sort((a, b) => a.accuracy - b.accuracy).slice(0, 2);
  const tasks = [
    ...weakest.map((subject, index) => ({ key: `weak-${subject.id}`, title: `Resolver 10 questões de ${subject.subject}`, detail: `${subject.accuracy}% de aproveitamento atual`, kind: "Questões", priority: index + 1 })),
    ...(reviews.pending.length ? [{ key: "reviews", title: `Revisar ${Math.min(5, reviews.pending.length)} questões do caderno de erros`, detail: `${reviews.pending.length} revisão(ões) pendente(s)`, kind: "Revisão", priority: 3 }] : []),
    ...planner.days.flatMap((day) => day.key === today ? day.activities.filter((item) => !item.completedAt).slice(0, 1).map((item) => ({ key: `planner-${item.id}`, title: item.title, detail: "Atividade prevista no planejamento", kind: "Planejamento", priority: 4 })) : []),
    ...(!weakest.length ? [{ key: "start", title: "Iniciar um simulado diagnóstico", detail: "Seu histórico ainda não possui respostas suficientes", kind: "Simulado", priority: 1 }] : []),
  ].slice(0, 5);
  return {
    today,
    tasks: tasks.map((task) => ({ ...task, completed: completedKeys.has(task.key) })),
    goals: goals.filter((goal) => goal.isActive).slice(0, 3),
    availableMinutes: planner.days.flatMap((day) => day.key === today ? day.activities : []).reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0) || plan?.minutesPerDay || 0,
  };
}

export async function getStudyPlan(userId: string) {
  const [plan] = await getDb().select({
    id: studyPlans.id,
    userId: studyPlans.userId,
    examDate: studyPlans.examDate,
    daysPerWeek: studyPlans.daysPerWeek,
    minutesPerDay: studyPlans.minutesPerDay,
    currentLevel: studyPlans.currentLevel,
    difficultSubjectIds: studyPlans.difficultSubjectIds,
    schedule: studyPlans.schedule,
    generatedAt: studyPlans.generatedAt,
    createdAt: studyPlans.createdAt,
    updatedAt: studyPlans.updatedAt,
    daysToExam: sql<number>`greatest(0, ${studyPlans.examDate} - (current_timestamp at time zone 'America/Sao_Paulo')::date)`,
  }).from(studyPlans).where(eq(studyPlans.userId, userId)).limit(1);
  if (!plan) return null;
  const analytics = await getStudyAnalytics(userId);
  const priorities = analytics.subjectPerformance.slice().sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  if (!priorities.length) return plan;
  return {
    ...plan,
    schedule: plan.schedule.map((day, dayIndex) => ({
      ...day,
      blocks: day.blocks.map((block, blockIndex) =>
        blockIndex === 0 && block.kind !== "SIMULATION"
          ? { ...block, subject: priorities[dayIndex % priorities.length].subject }
          : block,
      ),
    })),
    adaptivePriorities: priorities.map((subject) => subject.subject),
  };
}
