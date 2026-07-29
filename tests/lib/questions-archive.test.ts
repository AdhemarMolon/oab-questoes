import { describe, expect, it } from "vitest";

import { archiveQuestions } from "../../app/questions-archive-data";

const EXPECTED_ANNULLED = new Map([
  [27, [41]],
  [28, [37]],
  [29, [20, 34]],
  [30, [20, 30, 57]],
  [31, []],
  [32, [3, 45, 55, 61, 74]],
  [33, [59]],
  [34, [63]],
  [35, [47, 62]],
  [36, [50, 51]],
]);

describe("official OAB question archive", () => {
  it("contains ten complete editions with stable identifiers", () => {
    expect(archiveQuestions).toHaveLength(800);
    expect(new Set(archiveQuestions.map((question) => question.id)).size).toBe(
      800,
    );

    for (const edition of EXPECTED_ANNULLED.keys()) {
      const questions = archiveQuestions.filter(
        (question) => question.exam === edition,
      );

      expect(questions).toHaveLength(80);
      expect(questions.map((question) => question.number)).toEqual(
        Array.from({ length: 80 }, (_, index) => index + 1),
      );
    }
  });

  it("keeps four alternatives and a valid definitive answer", () => {
    for (const question of archiveQuestions) {
      expect(Object.keys(question.options)).toEqual(["A", "B", "C", "D"]);
      expect(Object.values(question.options).every(Boolean)).toBe(true);
      if (question.annulled) {
        expect(question.answer).toBeNull();
      } else {
        expect(question.answer).toMatch(/^[ABCD]$/);
      }
    }
  });

  it("matches the official annulments for each booklet", () => {
    for (const [edition, expected] of EXPECTED_ANNULLED) {
      expect(
        archiveQuestions
          .filter((question) => question.exam === edition && question.annulled)
          .map((question) => question.number),
      ).toEqual(expected);
    }
  });

  it("preserves source traceability", () => {
    for (const question of archiveQuestions) {
      expect(question.sourceUrl).toMatch(/^https:\/\/(s\.oab\.org\.br|oab\.fgv\.br)\//);
      expect(question.sourcePage).toBeGreaterThan(0);
      expect(question.bookletCode).toMatch(/^TYPE_[12]$/);
      expect(question.source).toContain("OAB/FGV");
    }
  });
});
