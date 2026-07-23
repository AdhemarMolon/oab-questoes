import "dotenv/config";

import { asc, eq, inArray } from "drizzle-orm";

import { questions as legacyQuestions } from "../app/questions-data";
import { getDb } from "../db";
import {
  exams,
  questions as questionTable,
  simulationQuestions,
  simulations,
  subjects,
} from "../db/schema";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada. Copie .env.example para .env.local antes do seed.");
  }

  const database = getDb();
  const subjectNames = [...new Set(legacyQuestions.map((question) => question.subject))];

  await database
    .insert(subjects)
    .values(subjectNames.map((name, index) => ({ name, slug: slugify(name), displayOrder: index + 1 })))
    .onConflictDoNothing({ target: subjects.slug });

  const subjectRows = await database.select().from(subjects);
  const subjectByName = new Map(subjectRows.map((subject) => [subject.name, subject.id]));
  const examData = [...new Map(legacyQuestions.map((question) => [question.exam, question.year])).entries()]
    .sort(([left], [right]) => left - right)
    .map(([edition, year]) => ({
      edition,
      year,
      phase: 1,
      title: `${edition}º Exame de Ordem`,
      bookletCode: "TYPE_1",
      bookletName: "Tipo 1 — Branca",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    }));

  await database
    .insert(exams)
    .values(examData)
    .onConflictDoNothing({ target: [exams.edition, exams.phase, exams.bookletCode] });

  const examRows = await database.select().from(exams);
  const examByEdition = new Map(examRows.map((exam) => [exam.edition, exam.id]));
  const questionValues = legacyQuestions.map((question) => {
    const examId = examByEdition.get(question.exam);
    const subjectId = subjectByName.get(question.subject);
    if (!examId || !subjectId) throw new Error(`Relacionamento ausente para ${question.id}.`);
    return {
      externalId: question.id,
      examId,
      subjectId,
      number: question.number,
      statement: question.text,
      options: question.options,
      correctAnswer: question.annulled ? null : question.answer,
      annulled: question.annulled,
      verificationStatus: "UNVERIFIED" as const,
      source: "Acervo inicial importado — fonte documental a confirmar",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
  });

  for (const batch of chunks(questionValues, 80)) {
    await database
      .insert(questionTable)
      .values(batch)
      // Admin edits are authoritative after the first import and must not be
      // overwritten when the seed is executed again.
      .onConflictDoNothing({ target: questionTable.externalId });
  }

  const simulationDefinitions = examData
    .sort((left, right) => right.edition - left.edition)
    .map((exam, index) => ({
      slug: index === 0 ? `diagnostico-${exam.edition}` : `exame-${exam.edition}`,
      title: index === 0 ? `Diagnóstico — ${exam.edition}º Exame` : `${exam.edition}º Exame completo`,
      description:
        index === 0
          ? "O simulado incluído no acesso gratuito, com 80 questões e progresso sincronizado."
          : `Tentativa completa baseada no acervo catalogado do ${exam.edition}º Exame.`,
      access: index === 0 ? ("FREE" as const) : ("FULL_ACCESS" as const),
      status: "PUBLISHED" as const,
      durationMinutes: 300,
      publishedAt: new Date(),
      edition: exam.edition,
    }));

  await database
    .insert(simulations)
    .values(
      simulationDefinitions.map((simulation) => ({
        slug: simulation.slug,
        title: simulation.title,
        description: simulation.description,
        access: simulation.access,
        status: simulation.status,
        durationMinutes: simulation.durationMinutes,
        publishedAt: simulation.publishedAt,
      })),
    )
    .onConflictDoNothing({ target: simulations.slug });

  const simulationRows = await database
    .select()
    .from(simulations)
    .where(inArray(simulations.slug, simulationDefinitions.map((item) => item.slug)));

  for (const definition of simulationDefinitions) {
    const simulation = simulationRows.find((item) => item.slug === definition.slug);
    const examId = examByEdition.get(definition.edition);
    if (!simulation || !examId) continue;
    const examQuestions = await database
      .select({ id: questionTable.id, number: questionTable.number })
      .from(questionTable)
      .where(eq(questionTable.examId, examId))
      .orderBy(asc(questionTable.number));
    if (!examQuestions.length) continue;
    await database
      .insert(simulationQuestions)
      .values(
        examQuestions.map((question, index) => ({
          simulationId: simulation.id,
          questionId: question.id,
          position: index + 1,
        })),
      )
      .onConflictDoNothing();
  }

  console.info(
    `Seed concluído: ${subjectNames.length} matérias, ${examData.length} exames, ${questionValues.length} questões e ${simulationDefinitions.length} simulados.`,
  );
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
