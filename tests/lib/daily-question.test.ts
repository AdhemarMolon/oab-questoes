import { describe, expect, it } from "vitest";

import {
  formatDailyQuestionDate,
  getBrasiliaDateKey,
} from "@/lib/daily-question";

describe("daily question date", () => {
  it("changes exactly at midnight in Brasília", () => {
    expect(getBrasiliaDateKey(new Date("2026-08-18T02:59:59.999Z"))).toBe(
      "2026-08-17",
    );
    expect(getBrasiliaDateKey(new Date("2026-08-18T03:00:00.000Z"))).toBe(
      "2026-08-18",
    );
  });

  it("formats the date without shifting the calendar day", () => {
    expect(formatDailyQuestionDate("2026-08-18")).toBe("18 de agosto");
  });
});
