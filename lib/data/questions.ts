import { and, count, desc, eq, ilike, isNull, or } from "drizzle-orm";

import { getDb } from "@/db";
import { exams, questions, subjects } from "@/db/schema";
import { getOffset, normalizePage } from "@/lib/pagination";

export const QUESTION_PAGE_SIZE = 20;

export async function listPublishedQuestions(filters: {
  page?: string | number;
  query?: string;
  subjectId?: string;
  examId?: string;
} = {}) {
  const page = normalizePage(filters.page);
  const conditions = [eq(questions.status, "PUBLISHED"), isNull(questions.deletedAt)];
  const query = filters.query?.trim();
  if (query) {
    conditions.push(or(ilike(questions.statement, `%${query}%`), ilike(questions.externalId, `%${query}%`))!);
  }
  if (filters.subjectId) conditions.push(eq(questions.subjectId, filters.subjectId));
  if (filters.examId) conditions.push(eq(questions.examId, filters.examId));
  const where = and(...conditions);
  const database = getDb();

  const [rows, totals, subjectRows, examRows] = await Promise.all([
    database
      .select({
        id: questions.id,
        externalId: questions.externalId,
        number: questions.number,
        statement: questions.statement,
        options: questions.options,
        correctAnswer: questions.correctAnswer,
        annulled: questions.annulled,
        explanation: questions.explanation,
        verificationStatus: questions.verificationStatus,
        source: questions.source,
        sourceUrl: questions.sourceUrl,
        subject: subjects.name,
        exam: exams.title,
        edition: exams.edition,
      })
      .from(questions)
      .innerJoin(subjects, eq(subjects.id, questions.subjectId))
      .innerJoin(exams, eq(exams.id, questions.examId))
      .where(where)
      .orderBy(desc(exams.edition), questions.number)
      .limit(QUESTION_PAGE_SIZE)
      .offset(getOffset(page, QUESTION_PAGE_SIZE)),
    database.select({ total: count() }).from(questions).where(where),
    database
      .select({ id: subjects.id, name: subjects.name })
      .from(subjects)
      .where(eq(subjects.isActive, true))
      .orderBy(subjects.displayOrder, subjects.name),
    database
      .select({ id: exams.id, title: exams.title })
      .from(exams)
      .where(eq(exams.status, "PUBLISHED"))
      .orderBy(desc(exams.edition)),
  ]);

  return {
    questions: rows,
    total: Number(totals[0]?.total ?? 0),
    page,
    pageSize: QUESTION_PAGE_SIZE,
    subjects: subjectRows,
    exams: examRows,
  };
}
