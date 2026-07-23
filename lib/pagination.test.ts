import { describe, expect, it } from "vitest";

import { ADMIN_PAGE_SIZE, clampPage, getOffset, getTotalPages, normalizePage } from "./pagination";

describe("paginação administrativa", () => {
  it("usa páginas com exatamente dez registros", () => {
    expect(ADMIN_PAGE_SIZE).toBe(10);
    expect(getOffset(1)).toBe(0);
    expect(getOffset(2)).toBe(10);
  });

  it("normaliza valores inválidos", () => {
    expect(normalizePage(undefined)).toBe(1);
    expect(normalizePage("abc")).toBe(1);
    expect(normalizePage(-4)).toBe(1);
  });

  it("calcula e limita o total de páginas", () => {
    expect(getTotalPages(0)).toBe(1);
    expect(getTotalPages(21)).toBe(3);
    expect(clampPage(9, 21)).toBe(3);
  });
});
