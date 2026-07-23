import { z } from "zod";

const optionalDateTime = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? new Date(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), "Data inválida.");

export const questionOptionSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: z.string().trim().min(1, "Preencha todas as alternativas.").max(4_000),
});

export const questionInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    legacyKey: z.string().trim().max(64).optional().nullable(),
    examId: z.string().uuid("Selecione um exame."),
    subjectId: z.string().uuid("Selecione uma matéria."),
    number: z.coerce.number().int().min(1).max(200),
    stem: z.string().trim().min(20, "O enunciado precisa ter ao menos 20 caracteres.").max(20_000),
    options: z.array(questionOptionSchema).length(4, "A questão precisa ter quatro alternativas."),
    correctAnswer: z.enum(["A", "B", "C", "D"]).nullable(),
    annulled: z.boolean(),
    explanation: z.string().trim().max(20_000).optional().nullable(),
    sourceLabel: z.string().trim().min(3).max(240),
    sourceUrl: z.union([z.url("Informe uma URL válida."), z.literal("")]).optional().nullable(),
    status: z.enum(["draft", "published", "archived"]),
    verificationStatus: z.enum(["unverified", "verified", "rejected"]),
  })
  .superRefine((value, context) => {
    const labels = new Set(value.options.map((option) => option.label));
    if (labels.size !== 4) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Use exatamente uma alternativa A, B, C e D.",
      });
    }

    if (value.annulled && value.correctAnswer !== null) {
      context.addIssue({
        code: "custom",
        path: ["correctAnswer"],
        message: "Uma questão anulada não pode ter gabarito.",
      });
    }

    if (!value.annulled && value.correctAnswer === null) {
      context.addIssue({
        code: "custom",
        path: ["correctAnswer"],
        message: "Selecione o gabarito ou marque a questão como anulada.",
      });
    }
  });

export const announcementInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(1).max(4_000),
    status: z.enum(["draft", "published", "archived"]),
    audience: z.enum(["all", "free", "paid"]),
    dismissible: z.boolean().default(true),
    startsAt: optionalDateTime,
    endsAt: optionalDateTime,
  })
  .superRefine((value, context) => {
    if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "O término deve ser posterior ao início.",
      });
    }
  });

export const giftAccessInputSchema = z.object({
  userId: z.string().trim().min(1),
  planCode: z.enum(["monthly", "annual", "lifetime"]),
  durationDays: z.coerce.number().int().min(1).max(3_650).nullable(),
  reason: z.string().trim().min(3).max(500),
});

export const roleInputSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(["user", "admin"]),
});

export type QuestionInput = z.infer<typeof questionInputSchema>;
export type AnnouncementInput = z.infer<typeof announcementInputSchema>;
export type GiftAccessInput = z.infer<typeof giftAccessInputSchema>;
