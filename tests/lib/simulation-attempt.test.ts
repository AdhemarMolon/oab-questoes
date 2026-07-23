import { describe, expect, it } from "vitest";

import {
  calculateSimulationScore,
  formatSimulationTime,
  getSimulationClock,
} from "../../lib/simulation-attempt";

describe("calculateSimulationScore", () => {
  it("não transforma questões puladas em respostas erradas", () => {
    const score = calculateSimulationScore(10, [
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: false },
      { isCorrect: false },
    ]);

    expect(score).toEqual({
      total: 10,
      answered: 5,
      correct: 3,
      incorrect: 2,
      annulled: 0,
      skipped: 5,
      accuracy: 60,
    });
  });

  it("mantém o placar zerado quando todas forem puladas", () => {
    expect(calculateSimulationScore(8, [])).toMatchObject({
      answered: 0,
      correct: 0,
      incorrect: 0,
      skipped: 8,
      accuracy: 0,
    });
  });

  it("separa anuladas do aproveitamento", () => {
    expect(
      calculateSimulationScore(4, [
        { isCorrect: true },
        { isCorrect: false },
        { isCorrect: true, annulled: true },
      ]),
    ).toMatchObject({
      answered: 3,
      correct: 1,
      incorrect: 1,
      annulled: 1,
      skipped: 1,
      accuracy: 50,
    });
  });
});

describe("simulation clock", () => {
  const startedAt = "2026-07-23T12:00:00.000Z";

  it("calcula o tempo restante a partir do prazo absoluto", () => {
    expect(
      getSimulationClock({
        startedAt,
        expiresAt: "2026-07-23T14:00:00.000Z",
        now: "2026-07-23T12:30:00.000Z",
      }),
    ).toEqual({ mode: "countdown", seconds: 5400, expired: false });
  });

  it("marca o cronômetro como expirado sem produzir tempo negativo", () => {
    expect(
      getSimulationClock({
        startedAt,
        expiresAt: "2026-07-23T13:00:00.000Z",
        now: "2026-07-23T13:00:01.000Z",
      }),
    ).toEqual({ mode: "countdown", seconds: 0, expired: true });
  });

  it("mede o tempo decorrido quando não há limite configurado", () => {
    expect(
      getSimulationClock({
        startedAt,
        now: "2026-07-23T12:01:05.000Z",
      }),
    ).toEqual({ mode: "elapsed", seconds: 65, expired: false });
    expect(formatSimulationTime(3661)).toBe("01:01:01");
  });
});
