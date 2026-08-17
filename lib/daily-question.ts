export const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

const brasiliaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BRASILIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getBrasiliaDateKey(now = new Date()): string {
  return brasiliaDateFormatter.format(now);
}

export function formatDailyQuestionDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) return dateKey;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}
