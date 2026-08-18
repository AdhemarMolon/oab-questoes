"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import {
  dailyStudyCompletions,
  favorites,
  questionStudyStates,
  studyActivities,
  studyGoals,
  studyNotes,
  studyPlans,
  type StudyPlanSchedule,
} from "@/db/schema";
import { getUserAccess } from "@/lib/data/access";
import { getStudyAnalytics, listStudySubjects } from "@/lib/data/study";
import { requireUser as requireAuthenticatedUser } from "@/lib/session";

const optionalUuid = z.string().uuid().or(z.literal("")).transform((value) => value || null);
const optionalPositive = z
  .string()
  .transform((value) => (value ? Number(value) : null))
  .pipe(z.number().int().positive().nullable());

async function requireUser() {
  const session = await requireAuthenticatedUser();
  const access = await getUserAccess(session.user.id);
  if (!access.hasFullAccess) {
    throw new Error("FULL_ACCESS_REQUIRED");
  }
  return session;
}

function revalidatePanel(path: string) {
  revalidatePath("/painel");
  revalidatePath(`/painel/${path}`);
}

export async function saveActivityAction(formData: FormData) {
  const parsed = z.object({
    id: optionalUuid,
    title: z.string().trim().min(3).max(180),
    description: z.string().trim().max(1000),
    subjectId: optionalUuid,
    type: z.enum(["QUESTIONS", "THEORY", "REVIEW", "SIMULATION", "TIME", "CUSTOM"]),
    scheduledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    estimatedMinutes: optionalPositive,
    targetQuestions: optionalPositive,
  }).safeParse({
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    subjectId: String(formData.get("subjectId") ?? ""),
    type: formData.get("type"),
    scheduledAt: formData.get("scheduledAt"),
    estimatedMinutes: String(formData.get("estimatedMinutes") ?? ""),
    targetQuestions: String(formData.get("targetQuestions") ?? ""),
  });
  if (!parsed.success) return;
  const session = await requireUser();
  const values = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    subjectId: parsed.data.subjectId,
    type: parsed.data.type,
    scheduledAt: new Date(`${parsed.data.scheduledAt}:00-03:00`),
    estimatedMinutes: parsed.data.estimatedMinutes,
    targetQuestions: parsed.data.targetQuestions,
  };
  if (parsed.data.id) {
    await getDb().update(studyActivities).set(values).where(and(eq(studyActivities.id, parsed.data.id), eq(studyActivities.userId, session.user.id)));
  } else {
    await getDb().insert(studyActivities).values({ userId: session.user.id, ...values });
  }
  revalidatePanel("planejamento");
}

export async function toggleActivityAction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  const completed = formData.get("completed") === "true";
  if (!id.success) return;
  const session = await requireUser();
  await getDb().update(studyActivities).set({ completedAt: completed ? null : new Date() }).where(and(eq(studyActivities.id, id.data), eq(studyActivities.userId, session.user.id)));
  revalidatePanel("planejamento");
}

export async function deleteActivityAction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const session = await requireUser();
  await getDb().delete(studyActivities).where(and(eq(studyActivities.id, id.data), eq(studyActivities.userId, session.user.id)));
  revalidatePanel("planejamento");
}

export async function saveGoalAction(formData: FormData) {
  const parsed = z.object({
    id: optionalUuid,
    title: z.string().trim().min(3).max(180),
    metric: z.enum(["QUESTIONS", "STUDY_MINUTES", "SIMULATIONS", "ACCURACY", "SIMULATION_SCORE"]),
    period: z.enum(["DAILY", "WEEKLY", "MONTHLY", "UNTIL_DATE"]),
    targetValue: z.coerce.number().int().positive().max(100000),
  }).safeParse({
    id: String(formData.get("id") ?? ""),
    title: formData.get("title"),
    metric: formData.get("metric"),
    period: formData.get("period"),
    targetValue: formData.get("targetValue"),
  });
  if (!parsed.success) return;
  const session = await requireUser();
  const { id, ...values } = parsed.data;
  if (id) {
    await getDb().update(studyGoals).set(values).where(and(eq(studyGoals.id, id), eq(studyGoals.userId, session.user.id)));
  } else {
    await getDb().insert(studyGoals).values({ userId: session.user.id, ...values });
  }
  revalidatePanel("metas");
}

export async function deleteGoalAction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const session = await requireUser();
  await getDb().delete(studyGoals).where(and(eq(studyGoals.id, id.data), eq(studyGoals.userId, session.user.id)));
  revalidatePanel("metas");
}

export async function updateQuestionStudyStateAction(formData: FormData) {
  const parsed = z.object({
    questionId: z.string().uuid(),
    intent: z.enum(["review", "note", "remove"]),
    note: z.string().trim().max(2000),
    cycle: z.coerce.number().pipe(z.union([z.literal(1), z.literal(7), z.literal(15), z.literal(30)])),
  }).safeParse({
    questionId: formData.get("questionId"),
    intent: formData.get("intent"),
    note: String(formData.get("note") ?? ""),
    cycle: formData.get("cycle") ?? "1",
  });
  if (!parsed.success) return;
  const session = await requireUser();
  const now = new Date();
  const next = new Date(now.getTime() + parsed.data.cycle * 86400000);
  const values = parsed.data.intent === "review"
    ? { reviewedAt: now, nextReviewAt: next, reviewCycleDays: parsed.data.cycle }
    : parsed.data.intent === "remove"
      ? { removedFromErrorsAt: now }
      : { errorNote: parsed.data.note || null };
  await getDb().insert(questionStudyStates).values({ userId: session.user.id, questionId: parsed.data.questionId, ...values }).onConflictDoUpdate({ target: [questionStudyStates.userId, questionStudyStates.questionId], set: values });
  revalidatePanel("caderno-de-erros");
  revalidatePanel("revisoes");
}

export async function saveNoteAction(formData: FormData) {
  const tags = String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10);
  const parsed = z.object({
    id: optionalUuid,
    title: z.string().trim().min(2).max(180),
    content: z.string().trim().min(1).max(10000),
    subjectId: optionalUuid,
    questionId: optionalUuid,
  }).safeParse({
    id: String(formData.get("id") ?? ""),
    title: formData.get("title"),
    content: formData.get("content"),
    subjectId: String(formData.get("subjectId") ?? ""),
    questionId: String(formData.get("questionId") ?? ""),
  });
  if (!parsed.success) return;
  const session = await requireUser();
  const { id, ...values } = parsed.data;
  if (id) {
    await getDb().update(studyNotes).set({ ...values, tags }).where(and(eq(studyNotes.id, id), eq(studyNotes.userId, session.user.id)));
  } else {
    await getDb().insert(studyNotes).values({ userId: session.user.id, ...values, tags });
  }
  revalidatePanel("anotacoes");
}

export async function toggleNoteFavoriteAction(formData: FormData) {
  const parsed = z.object({ id: z.string().uuid(), favorite: z.enum(["true", "false"]) }).safeParse({ id: formData.get("id"), favorite: formData.get("favorite") });
  if (!parsed.success) return;
  const session = await requireUser();
  await getDb().update(studyNotes).set({ isFavorite: parsed.data.favorite !== "true" }).where(and(eq(studyNotes.id, parsed.data.id), eq(studyNotes.userId, session.user.id)));
  revalidatePanel("anotacoes");
}

export async function deleteNoteAction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const session = await requireUser();
  await getDb().delete(studyNotes).where(and(eq(studyNotes.id, id.data), eq(studyNotes.userId, session.user.id)));
  revalidatePanel("anotacoes");
}

export async function removeFavoriteAction(formData: FormData) {
  const questionId = z.string().uuid().safeParse(formData.get("questionId"));
  if (!questionId.success) return;
  const session = await requireUser();
  await getDb().delete(favorites).where(and(eq(favorites.userId, session.user.id), eq(favorites.questionId, questionId.data)));
  revalidatePanel("favoritas");
}

export async function addFavoriteAction(formData: FormData) {
  const questionId = z.string().uuid().safeParse(formData.get("questionId"));
  if (!questionId.success) return;
  const session = await requireUser();
  await getDb().insert(favorites).values({
    userId: session.user.id,
    questionId: questionId.data,
  }).onConflictDoNothing();
  revalidatePanel("favoritas");
  revalidatePanel("caderno-de-erros");
}

export async function toggleTodayTaskAction(formData: FormData) {
  const parsed = z.object({ dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), itemKey: z.string().min(1).max(120), completed: z.enum(["true", "false"]) }).safeParse({ dateKey: formData.get("dateKey"), itemKey: formData.get("itemKey"), completed: formData.get("completed") });
  if (!parsed.success) return;
  const session = await requireUser();
  const key = { userId: session.user.id, dateKey: parsed.data.dateKey, itemKey: parsed.data.itemKey };
  if (parsed.data.completed === "true") {
    await getDb().delete(dailyStudyCompletions).where(and(eq(dailyStudyCompletions.userId, key.userId), eq(dailyStudyCompletions.dateKey, key.dateKey), eq(dailyStudyCompletions.itemKey, key.itemKey)));
  } else {
    await getDb().insert(dailyStudyCompletions).values(key).onConflictDoNothing();
  }
  revalidatePanel("hoje");
}

export async function saveStudyPlanAction(formData: FormData) {
  const difficultSubjectIds = formData.getAll("difficultSubjectIds").map(String);
  const parsed = z.object({
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    daysPerWeek: z.coerce.number().int().min(1).max(7),
    hoursPerDay: z.coerce.number().min(0.25).max(12),
    currentLevel: z.enum(["INICIANTE", "INTERMEDIARIO", "AVANCADO"]),
    difficultSubjectIds: z.array(z.string().uuid()).max(12),
  }).safeParse({ examDate: formData.get("examDate"), daysPerWeek: formData.get("daysPerWeek"), hoursPerDay: formData.get("hoursPerDay"), currentLevel: formData.get("currentLevel"), difficultSubjectIds });
  if (!parsed.success || new Date(`${parsed.data.examDate}T12:00:00-03:00`) <= new Date()) return;
  const session = await requireUser();
  const [allSubjects, analytics] = await Promise.all([listStudySubjects(), getStudyAnalytics(session.user.id)]);
  const weakIds = analytics.subjectPerformance.slice().sort((a, b) => a.accuracy - b.accuracy).map((subject) => subject.id);
  const priorityIds = [...new Set([...parsed.data.difficultSubjectIds, ...weakIds, ...allSubjects.map((subject) => subject.id)])];
  const subjectById = new Map(allSubjects.map((subject) => [subject.id, subject.name]));
  const minutesPerDay = Math.round(parsed.data.hoursPerDay * 60);
  const kinds = ["THEORY", "QUESTIONS", "REVIEW"] as const;
  const schedule: StudyPlanSchedule = Array.from({ length: parsed.data.daysPerWeek }, (_, index) => {
    const subjectId = priorityIds[index % Math.max(priorityIds.length, 1)];
    const subject = subjectById.get(subjectId) ?? "Conteúdo geral";
    const blocks: StudyPlanSchedule[number]["blocks"] = kinds.map((kind) => ({ kind, subject, minutes: Math.max(10, Math.floor(minutesPerDay / kinds.length)) }));
    if (index === parsed.data.daysPerWeek - 1 && minutesPerDay >= 60) blocks[0] = { kind: "SIMULATION", subject: "Simulado e diagnóstico", minutes: Math.max(30, Math.floor(minutesPerDay / kinds.length)) };
    return { weekday: index + 1, blocks };
  });
  await getDb().insert(studyPlans).values({ userId: session.user.id, examDate: parsed.data.examDate, daysPerWeek: parsed.data.daysPerWeek, minutesPerDay, currentLevel: parsed.data.currentLevel, difficultSubjectIds: parsed.data.difficultSubjectIds, schedule }).onConflictDoUpdate({ target: studyPlans.userId, set: { examDate: parsed.data.examDate, daysPerWeek: parsed.data.daysPerWeek, minutesPerDay, currentLevel: parsed.data.currentLevel, difficultSubjectIds: parsed.data.difficultSubjectIds, schedule, generatedAt: new Date() } });
  revalidatePanel("plano-de-estudos");
}
