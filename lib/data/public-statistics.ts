import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { exams, questions, subjects } from "@/db/schema";

export const APPROVAL_SOURCE_URL =
  "https://examedeordem.oab.org.br/DadosEstatisticos";
export const APPROVAL_COMPILATION_URL =
  "https://oab.estrategia.com/portal/estatisticas-completas-do-exame-de-ordem-da-oab/";

type NationalApprovalStatistic = {
  registeredFirstPhase: number;
  presentFirstPhase: number | null;
  reuseRegistrations: number | null;
  totalRegistrations: number | null;
  finalApproved: number;
  overallApprovalRate: number | null;
  note?: string;
};

const NATIONAL_APPROVAL_BY_EDITION: Record<
  number,
  NationalApprovalStatistic
> = {
  37: {
    registeredFirstPhase: 151_654,
    presentFirstPhase: 140_827,
    reuseRegistrations: 24_967,
    totalRegistrations: 176_621,
    finalApproved: 40_212,
    overallApprovalRate: 22.77,
  },
  38: {
    registeredFirstPhase: 102_828,
    presentFirstPhase: 94_435,
    reuseRegistrations: 43_314,
    totalRegistrations: 146_142,
    finalApproved: 22_260,
    overallApprovalRate: 15.23,
  },
  39: {
    registeredFirstPhase: 133_777,
    presentFirstPhase: 123_906,
    reuseRegistrations: 14_656,
    totalRegistrations: 148_433,
    finalApproved: 22_246,
    overallApprovalRate: 14.99,
  },
  40: {
    registeredFirstPhase: 101_287,
    presentFirstPhase: 94_140,
    reuseRegistrations: 35_621,
    totalRegistrations: 136_908,
    finalApproved: 24_200,
    overallApprovalRate: 17.68,
  },
  41: {
    registeredFirstPhase: 124_933,
    presentFirstPhase: 101_332,
    reuseRegistrations: 16_213,
    totalRegistrations: 141_146,
    finalApproved: 20_073,
    overallApprovalRate: 14.22,
    note: "Taxa calculada a partir dos totais do relatório oficial por instituição: aprovados sobre inscrições, incluindo o reaproveitamento.",
  },
};

function share(questionCount: number, totalQuestions: number) {
  return totalQuestions > 0
    ? Math.round((questionCount / totalQuestions) * 1_000) / 10
    : 0;
}

export async function getPublicStatistics(requestedEdition?: number) {
  const database = getDb();
  const editionRows = await database
    .select({
      id: exams.id,
      edition: exams.edition,
      year: exams.year,
      title: exams.title,
    })
    .from(exams)
    .where(eq(exams.status, "PUBLISHED"))
    .orderBy(desc(exams.edition));

  if (!editionRows.length) return null;

  const selectedExam =
    editionRows.find((exam) => exam.edition === requestedEdition) ??
    editionRows[0];
  const selectedIndex = editionRows.findIndex(
    (exam) => exam.id === selectedExam.id,
  );
  const previousExam = editionRows[selectedIndex + 1] ?? null;

  const questionCondition = and(
    eq(questions.examId, selectedExam.id),
    eq(questions.status, "PUBLISHED"),
    isNull(questions.deletedAt),
  );

  const [summaryRows, subjectRows, previousSubjectRows] = await Promise.all([
    database
      .select({
        questions: count(questions.id),
        annulled: sql<number>`
          count(*) filter (where ${questions.annulled} = true)
        `,
      })
      .from(questions)
      .where(questionCondition),
    database
      .select({
        subject: subjects.name,
        questionCount: count(questions.id),
      })
      .from(questions)
      .innerJoin(subjects, eq(subjects.id, questions.subjectId))
      .where(questionCondition)
      .groupBy(subjects.id, subjects.name, subjects.displayOrder)
      .orderBy(desc(count(questions.id)), subjects.displayOrder),
    previousExam
      ? database
          .select({
            subject: subjects.name,
            questionCount: count(questions.id),
          })
          .from(questions)
          .innerJoin(subjects, eq(subjects.id, questions.subjectId))
          .where(
            and(
              eq(questions.examId, previousExam.id),
              eq(questions.status, "PUBLISHED"),
              isNull(questions.deletedAt),
            ),
          )
          .groupBy(subjects.id, subjects.name)
      : Promise.resolve([]),
  ]);

  const totalQuestions = Number(summaryRows[0]?.questions ?? 0);
  const subjectDistribution = subjectRows.map((row, index) => {
    const questionCount = Number(row.questionCount);
    return {
      rank: index + 1,
      subject: row.subject,
      questionCount,
      share: share(questionCount, totalQuestions),
    };
  });
  const previousCounts = new Map(
    previousSubjectRows.map((row) => [
      row.subject,
      Number(row.questionCount),
    ]),
  );
  const editionChanges = subjectDistribution
    .map((subject) => ({
      subject: subject.subject,
      current: subject.questionCount,
      previous: previousCounts.get(subject.subject) ?? 0,
      difference:
        subject.questionCount - (previousCounts.get(subject.subject) ?? 0),
    }))
    .filter((subject) => subject.difference !== 0)
    .sort(
      (left, right) =>
        Math.abs(right.difference) - Math.abs(left.difference) ||
        left.subject.localeCompare(right.subject, "pt-BR"),
    );

  return {
    editions: editionRows.map((exam) => ({
      edition: exam.edition,
      year: exam.year,
      title: exam.title,
    })),
    selectedExam: {
      edition: selectedExam.edition,
      year: selectedExam.year,
      title: selectedExam.title,
      totalQuestions,
      annulledQuestions: Number(summaryRows[0]?.annulled ?? 0),
      subjectCount: subjectDistribution.length,
      passingQuestions: Math.ceil(totalQuestions * 0.5),
    },
    previousEdition: previousExam?.edition ?? null,
    approval: NATIONAL_APPROVAL_BY_EDITION[selectedExam.edition] ?? null,
    subjectDistribution,
    mostFrequent: subjectDistribution.slice(0, 5),
    leastFrequent: [...subjectDistribution]
      .sort(
        (left, right) =>
          left.questionCount - right.questionCount ||
          left.subject.localeCompare(right.subject, "pt-BR"),
      )
      .slice(0, 5),
    topFiveShare: Math.round(
      subjectDistribution
        .slice(0, 5)
        .reduce((total, subject) => total + subject.share, 0) * 10,
    ) / 10,
    editionChanges,
  };
}
