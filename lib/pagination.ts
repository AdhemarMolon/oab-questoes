export const ADMIN_PAGE_SIZE = 10;

export function normalizePage(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

export function getOffset(page: number, pageSize = ADMIN_PAGE_SIZE) {
  return (normalizePage(page) - 1) * pageSize;
}

export function getTotalPages(total: number, pageSize = ADMIN_PAGE_SIZE) {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

export function clampPage(page: number, total: number, pageSize = ADMIN_PAGE_SIZE) {
  return Math.min(normalizePage(page), getTotalPages(total, pageSize));
}
