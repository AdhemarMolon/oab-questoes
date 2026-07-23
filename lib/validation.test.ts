import { describe, expect, it } from "vitest";

import { announcementInputSchema, questionInputSchema } from "./validation";

const validQuestion = {
  examId: "8e8ca4c9-2111-4427-8dd7-946d6def64dd",
  subjectId: "36b3427b-39be-4453-b27e-ed58ecbb8584",
  number: 1,
  stem: "Este é um enunciado válido com tamanho suficiente.",
  options: [
    { label: "A" as const, text: "Alternativa A" },
    { label: "B" as const, text: "Alternativa B" },
    { label: "C" as const, text: "Alternativa C" },
    { label: "D" as const, text: "Alternativa D" },
  ],
  correctAnswer: "A" as const,
  annulled: false,
  sourceLabel: "Fonte a confirmar",
  status: "draft" as const,
  verificationStatus: "unverified" as const,
};

describe("validação de questões", () => {
  it("aceita quatro alternativas e um gabarito", () => {
    expect(questionInputSchema.safeParse(validQuestion).success).toBe(true);
  });

  it("rejeita gabarito em questão anulada", () => {
    expect(questionInputSchema.safeParse({ ...validQuestion, annulled: true }).success).toBe(false);
  });

  it("rejeita alternativas repetidas", () => {
    const options = validQuestion.options.map((option) => ({ ...option, label: "A" as const }));
    expect(questionInputSchema.safeParse({ ...validQuestion, options }).success).toBe(false);
  });
});

describe("validação de comunicados", () => {
  it("rejeita uma janela de publicação invertida", () => {
    const result = announcementInputSchema.safeParse({
      title: "Aviso importante",
      body: "Conteúdo",
      status: "published",
      audience: "all",
      dismissible: true,
      startsAt: "2026-07-23T10:00:00.000Z",
      endsAt: "2026-07-22T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
