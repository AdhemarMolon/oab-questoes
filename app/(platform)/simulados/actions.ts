"use server";

import { and, count, eq, exists, isNull, notExists, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type {
  SimulationAnswerInput,
  SimulationAnswerResult,
  SimulationFinishResult,
  SimulationPauseResult,
  SimulationSkipInput,
  SimulationSkipResult,
} from "@/components/study";
import { getDb } from "@/db";
import {
  simulationAnswers,
  simulationAttemptQuestions,
  simulationAttempts,
} from "@/db/schema";
import { getUserAccess } from "@/lib/data/access";
import {
  createSimulationAttempt,
  finalizeSimulationAttemptForUser,
  findAttemptItem,
  pauseSimulationAttemptForUser,
  resumeSimulationAttemptForUser,
} from "@/lib/data/simulations";
import { requireUser } from "@/lib/session";

const startSchema = z.object({
  simulationId: z.string().uuid(),
  clientRequestId: z.string().uuid(),
  replacePreviousResult: z.boolean(),
});

const answerSchema = z.object({
  attemptId: z.string().uuid(),
  itemId: z.string().uuid(),
  selectedAnswer: z.enum(["A", "B", "C", "D"]),
});

const skipSchema = z.object({
  attemptId: z.string().uuid(),
  itemId: z.string().uuid(),
});

function attemptExpired(expiresAt: Date | null) {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

function publicStartError(error: unknown) {
  if (error instanceof Error) {
    const expected = [
      "Simulado não encontrado.",
      "Este simulado exige acesso completo.",
      "Este simulado ainda não possui questões publicadas.",
      "Confirme que deseja sobrepor o último resultado deste simulado.",
    ];
    if (expected.includes(error.message)) return error.message;
  }
  return "Não foi possível iniciar o simulado agora.";
}

export async function startSimulationAction(formData: FormData) {
  const parsed = startSchema.safeParse({
    simulationId: formData.get("simulationId"),
    clientRequestId: formData.get("clientRequestId"),
    replacePreviousResult:
      formData.get("replacePreviousResult") === "true",
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
      replacePreviousResult: parsed.data.replacePreviousResult,
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

export async function resumeSimulationAttemptAction(formData: FormData) {
  const parsed = z.string().uuid().safeParse(formData.get("attemptId"));
  if (!parsed.success) {
    redirect("/simulados?erro=simulado-invalido");
  }

  const session = await requireUser();
  let result: Awaited<ReturnType<typeof resumeSimulationAttemptForUser>>;
  try {
    result = await resumeSimulationAttemptForUser({
      userId: session.user.id,
      attemptId: parsed.data,
    });
  } catch (error) {
    console.error("Failed to resume simulation attempt.", error);
    const message = encodeURIComponent(
      "Não foi possível retomar o simulado agora.",
    );
    redirect(`/simulados?erro=${message}`);
  }

  if (!result.ok) {
    const message = encodeURIComponent(
      "Não foi possível retomar o simulado agora.",
    );
    redirect(`/simulados?erro=${message}`);
  }

  revalidatePath("/painel");
  revalidatePath("/simulados");
  revalidatePath(`/simulados/${parsed.data}`);
  redirect(`/simulados/${parsed.data}`);
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
    if (item.pausedAt) {
      return { ok: false, error: "Esta tentativa está pausada." };
    }
    if (attemptExpired(item.expiresAt)) {
      return {
        ok: false,
        error: "O tempo deste simulado terminou. Finalize para consultar o resultado.",
      };
    }
    if (!(parsed.data.selectedAnswer in item.snapshot.options)) {
      return { ok: false, error: "Alternativa indisponível nesta questão." };
    }
    if (!item.snapshot.annulled && !item.correctAnswer) {
      return { ok: false, error: "O gabarito desta questão precisa ser revisado." };
    }

    const isCorrect = item.snapshot.annulled || item.correctAnswer === parsed.data.selectedAnswer;
    const database = getDb();
    const lockAttempt = database
      .select({ id: simulationAttempts.id })
      .from(simulationAttempts)
      .where(
        and(
          eq(simulationAttempts.id, parsed.data.attemptId),
          eq(simulationAttempts.userId, session.user.id),
        ),
      )
      .for("update");
    const answerSource = database
      .select({
        attemptQuestionId: simulationAttemptQuestions.id,
        selectedAnswer: sql<string>`${parsed.data.selectedAnswer}`.as(
          "selected_answer",
        ),
        isCorrect: sql<boolean>`${isCorrect}`.as("is_correct"),
        answeredAt: sql<Date>`current_timestamp`.as("answered_at"),
        updatedAt: sql<Date>`current_timestamp`.as("updated_at"),
      })
      .from(simulationAttemptQuestions)
      .innerJoin(
        simulationAttempts,
        eq(simulationAttempts.id, simulationAttemptQuestions.attemptId),
      )
      .where(
        and(
          eq(simulationAttemptQuestions.id, item.itemId),
          eq(simulationAttemptQuestions.attemptId, parsed.data.attemptId),
          eq(simulationAttempts.userId, session.user.id),
          eq(simulationAttempts.status, "IN_PROGRESS"),
          isNull(simulationAttempts.pausedAt),
          sql`(
            ${simulationAttempts.expiresAt} is null
            or ${simulationAttempts.expiresAt} > current_timestamp
          )`,
        ),
      );
    const storedAnswerQuery = database
      .select({
        selectedAnswer: simulationAnswers.selectedAnswer,
      })
      .from(simulationAnswers)
      .where(eq(simulationAnswers.attemptQuestionId, item.itemId))
      .limit(1);
    const totalQuery = database
      .select({ answered: count() })
      .from(simulationAnswers)
      .innerJoin(
        simulationAttemptQuestions,
        eq(simulationAttemptQuestions.id, simulationAnswers.attemptQuestionId),
      )
      .where(eq(simulationAttemptQuestions.attemptId, parsed.data.attemptId));

    const [, , , storedAnswers, totals] = await database.batch([
      lockAttempt,
      database
        .insert(simulationAnswers)
        .select(answerSource)
        .onConflictDoNothing({ target: simulationAnswers.attemptQuestionId }),
      database
        .update(simulationAttemptQuestions)
        .set({ skippedAt: null })
        .where(
          and(
            eq(simulationAttemptQuestions.id, item.itemId),
            exists(storedAnswerQuery),
          ),
        ),
      storedAnswerQuery,
      totalQuery,
    ]);

    const stored = storedAnswers[0];
    const answeredCount = Number(totals[0]?.answered ?? 0);
    if (!stored) {
      return {
        ok: false,
        error:
          "A tentativa foi encerrada antes de salvar esta resposta. Consulte o resultado.",
      };
    }

    revalidatePath(`/simulados/${parsed.data.attemptId}`);
    return {
      ok: true,
      selectedAnswer: stored.selectedAnswer as "A" | "B" | "C" | "D",
      answeredCount,
      total: item.totalQuestions,
      completed: answeredCount >= item.totalQuestions,
    };
  } catch (error) {
    console.error("Failed to save simulation answer.", error);
    return { ok: false, error: "Não foi possível salvar sua resposta. Tente novamente." };
  }
}

export async function skipSimulationQuestion(
  input: SimulationSkipInput,
): Promise<SimulationSkipResult> {
  const parsed = skipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Questão inválida." };

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
    if (item.pausedAt) {
      return { ok: false, error: "Esta tentativa está pausada." };
    }
    if (attemptExpired(item.expiresAt)) {
      return {
        ok: false,
        error: "O tempo deste simulado terminou. Finalize para consultar o resultado.",
      };
    }

    const database = getDb();
    const existingAnswerQuery = database
      .select({ itemId: simulationAnswers.attemptQuestionId })
      .from(simulationAnswers)
      .where(eq(simulationAnswers.attemptQuestionId, item.itemId))
      .limit(1);
    const eligibleAttempt = database
      .select({ id: simulationAttempts.id })
      .from(simulationAttempts)
      .where(
        and(
          eq(simulationAttempts.id, parsed.data.attemptId),
          eq(simulationAttempts.userId, session.user.id),
          eq(simulationAttempts.status, "IN_PROGRESS"),
          isNull(simulationAttempts.pausedAt),
          sql`(
            ${simulationAttempts.expiresAt} is null
            or ${simulationAttempts.expiresAt} > current_timestamp
          )`,
        ),
      );
    const [lockedAttempts, updatedItems, existingAnswers] =
      await database.batch([
        database
          .select({ id: simulationAttempts.id })
          .from(simulationAttempts)
          .where(
            and(
              eq(simulationAttempts.id, parsed.data.attemptId),
              eq(simulationAttempts.userId, session.user.id),
            ),
          )
          .for("update"),
        database
          .update(simulationAttemptQuestions)
          .set({ skippedAt: new Date() })
          .where(
            and(
              eq(simulationAttemptQuestions.id, item.itemId),
              eq(
                simulationAttemptQuestions.attemptId,
                parsed.data.attemptId,
              ),
              exists(eligibleAttempt),
              notExists(existingAnswerQuery),
            ),
          )
          .returning({ id: simulationAttemptQuestions.id }),
        existingAnswerQuery,
      ]);

    if (existingAnswers[0]) return { ok: true };
    if (!lockedAttempts[0] || !updatedItems[0]) {
      return {
        ok: false,
        error: "A tentativa foi encerrada antes de registrar esta questão como pulada.",
      };
    }

    revalidatePath(`/simulados/${parsed.data.attemptId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível pular esta questão. Tente novamente." };
  }
}

export async function pauseSimulationAttempt(
  attemptId: string,
): Promise<SimulationPauseResult> {
  const parsed = z.string().uuid().safeParse(attemptId);
  if (!parsed.success) {
    return { ok: false, error: "Tentativa inválida." };
  }

  try {
    const session = await requireUser();
    const result = await pauseSimulationAttemptForUser({
      userId: session.user.id,
      attemptId: parsed.data,
    });

    if (!result.ok) {
      return {
        ok: false,
        error: "Esta tentativa não pode ser pausada agora.",
      };
    }

    revalidatePath("/painel");
    revalidatePath("/simulados");
    revalidatePath(`/simulados/${parsed.data}`);
    return { ok: true, redirectTo: "/simulados" };
  } catch (error) {
    console.error("Failed to pause simulation attempt.", error);
    return {
      ok: false,
      error: "Não foi possível pausar o simulado agora.",
    };
  }
}

export async function finishSimulationAttempt(attemptId: string): Promise<SimulationFinishResult> {
  const parsed = z.string().uuid().safeParse(attemptId);
  if (!parsed.success) return { ok: false, error: "Tentativa inválida." };

  try {
    const session = await requireUser();
    const result = await finalizeSimulationAttemptForUser({
      userId: session.user.id,
      attemptId: parsed.data,
    });

    if (!result.ok && result.reason === "NOT_FOUND") {
      return { ok: false, error: "Tentativa não encontrada." };
    }
    if (!result.ok) {
      return {
        ok: false,
        error: "Esta tentativa não pode mais ser finalizada.",
      };
    }

    revalidatePath("/painel");
    revalidatePath("/simulados");
    return {
      ok: true,
      redirectTo: `/simulados/${result.attemptId}/resultado`,
    };
  } catch {
    return { ok: false, error: "Não foi possível finalizar o simulado agora." };
  }
}
