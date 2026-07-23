"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type {
  SimulationAnswerInput,
  SimulationAnswerResult,
  SimulationFinishResult,
} from "@/components/study";
import { getDb } from "@/db";
import {
  simulationAnswers,
  simulationAttemptQuestions,
  simulationAttempts,
} from "@/db/schema";
import { getUserAccess } from "@/lib/data/access";
import { createSimulationAttempt, findAttemptItem } from "@/lib/data/simulations";
import { requireUser } from "@/lib/session";

const startSchema = z.object({
  simulationId: z.string().uuid(),
  clientRequestId: z.string().uuid(),
});

const answerSchema = z.object({
  attemptId: z.string().uuid(),
  itemId: z.string().uuid(),
  selectedAnswer: z.enum(["A", "B", "C", "D"]),
});

function publicStartError(error: unknown) {
  if (error instanceof Error) {
    const expected = [
      "Simulado não encontrado.",
      "Este simulado exige acesso completo.",
      "Este simulado ainda não possui questões publicadas.",
    ];
    if (expected.includes(error.message)) return error.message;
  }
  return "Não foi possível iniciar o simulado agora.";
}

export async function startSimulationAction(formData: FormData) {
  const parsed = startSchema.safeParse({
    simulationId: formData.get("simulationId"),
    clientRequestId: formData.get("clientRequestId"),
  });

  if (!parsed.success) {
    redirect("/simulados?erro=simulado-invalido");
  }

  const session = await requireUser();
  const access = await getUserAccess(session.user.id);
  let attemptId: string;

  try {
    attemptId = await createSimulationAttempt({
      userId: session.user.id,
      simulationId: parsed.data.simulationId,
      clientRequestId: parsed.data.clientRequestId,
      access,
    });
  } catch (error) {
    const message = encodeURIComponent(publicStartError(error));
    redirect(`/simulados?erro=${message}`);
  }

  revalidatePath("/simulados");
  revalidatePath("/painel");
  redirect(`/simulados/${attemptId}`);
}

export async function answerSimulationQuestion(
  input: SimulationAnswerInput,
): Promise<SimulationAnswerResult> {
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Resposta inválida." };

  try {
    const session = await requireUser();
    const item = await findAttemptItem({
      userId: session.user.id,
      attemptId: parsed.data.attemptId,
      itemId: parsed.data.itemId,
    });

    if (!item) return { ok: false, error: "Questão não encontrada nesta tentativa." };
    if (item.status !== "IN_PROGRESS") {
      return { ok: false, error: "Esta tentativa já foi encerrada." };
    }
    if (!(parsed.data.selectedAnswer in item.snapshot.options)) {
      return { ok: false, error: "Alternativa indisponível nesta questão." };
    }
    if (!item.snapshot.annulled && !item.correctAnswer) {
      return { ok: false, error: "O gabarito desta questão precisa ser revisado." };
    }

    const isCorrect = item.snapshot.annulled || item.correctAnswer === parsed.data.selectedAnswer;
    const database = getDb();

    await database
      .insert(simulationAnswers)
      .values({
        attemptQuestionId: item.itemId,
        selectedAnswer: parsed.data.selectedAnswer,
        isCorrect,
      })
      .onConflictDoNothing({ target: simulationAnswers.attemptQuestionId });

    const [storedAnswers, totals] = await Promise.all([
      database
        .select({
          selectedAnswer: simulationAnswers.selectedAnswer,
          isCorrect: simulationAnswers.isCorrect,
        })
        .from(simulationAnswers)
        .where(eq(simulationAnswers.attemptQuestionId, item.itemId))
        .limit(1),
      database
        .select({ answered: count() })
        .from(simulationAnswers)
        .innerJoin(
          simulationAttemptQuestions,
          eq(simulationAttemptQuestions.id, simulationAnswers.attemptQuestionId),
        )
        .where(eq(simulationAttemptQuestions.attemptId, parsed.data.attemptId)),
    ]);

    const stored = storedAnswers[0];
    const answeredCount = Number(totals[0]?.answered ?? 0);
    if (!stored) return { ok: false, error: "Não foi possível confirmar a resposta." };

    revalidatePath(`/simulados/${parsed.data.attemptId}`);
    return {
      ok: true,
      selectedAnswer: stored.selectedAnswer as "A" | "B" | "C" | "D",
      correctAnswer: item.correctAnswer as "A" | "B" | "C" | "D" | null,
      isCorrect: stored.isCorrect,
      annulled: item.snapshot.annulled,
      answeredCount,
      total: item.totalQuestions,
      completed: answeredCount >= item.totalQuestions,
    };
  } catch {
    return { ok: false, error: "Não foi possível salvar sua resposta. Tente novamente." };
  }
}

export async function finishSimulationAttempt(attemptId: string): Promise<SimulationFinishResult> {
  const parsed = z.string().uuid().safeParse(attemptId);
  if (!parsed.success) return { ok: false, error: "Tentativa inválida." };

  try {
    const session = await requireUser();
    const database = getDb();
    const attempts = await database
      .select({
        id: simulationAttempts.id,
        status: simulationAttempts.status,
        totalQuestions: simulationAttempts.totalQuestions,
      })
      .from(simulationAttempts)
      .where(
        and(
          eq(simulationAttempts.id, parsed.data),
          eq(simulationAttempts.userId, session.user.id),
        ),
      )
      .limit(1);
    const attempt = attempts[0];

    if (!attempt) return { ok: false, error: "Tentativa não encontrada." };
    if (attempt.status === "SUBMITTED") {
      return { ok: true, redirectTo: `/simulados/${attempt.id}/resultado` };
    }
    if (attempt.status !== "IN_PROGRESS") {
      return { ok: false, error: "Esta tentativa não pode mais ser finalizada." };
    }

    const totals = await database
      .select({
        answered: count(),
        correct: sql<number>`count(*) filter (where ${simulationAnswers.isCorrect} = true)`,
      })
      .from(simulationAnswers)
      .innerJoin(
        simulationAttemptQuestions,
        eq(simulationAttemptQuestions.id, simulationAnswers.attemptQuestionId),
      )
      .where(eq(simulationAttemptQuestions.attemptId, attempt.id));
    const answered = Number(totals[0]?.answered ?? 0);
    const correct = Number(totals[0]?.correct ?? 0);

    if (answered < attempt.totalQuestions) {
      return {
        ok: false,
        error: `Responda as ${attempt.totalQuestions - answered} questões pendentes antes de finalizar.`,
      };
    }

    await database
      .update(simulationAttempts)
      .set({ status: "SUBMITTED", correctAnswers: correct, submittedAt: new Date() })
      .where(
        and(
          eq(simulationAttempts.id, attempt.id),
          eq(simulationAttempts.status, "IN_PROGRESS"),
        ),
      );

    revalidatePath("/painel");
    revalidatePath("/simulados");
    return { ok: true, redirectTo: `/simulados/${attempt.id}/resultado` };
  } catch {
    return { ok: false, error: "Não foi possível finalizar o simulado agora." };
  }
}
