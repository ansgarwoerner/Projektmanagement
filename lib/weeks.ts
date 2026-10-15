const TIME_ZONE = "Europe/Berlin";

const WEEK_LABELS = ["Diese Woche", "Nächste Woche", "Woche 3", "Woche 4"] as const;

export type WeekWindow = {
  start: string;
  end: string;
  label: string;
  rangeLabel: string;
  isCurrent: boolean;
};

export function berlinToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const date = parseIso(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

export function mondayOf(isoDate: string): string {
  const date = parseIso(isoDate);
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + diff);
  return toIso(date);
}

export function isMonday(isoDate: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) && mondayOf(isoDate) === isoDate;
}

export function fourWeeks(now = new Date()): WeekWindow[] {
  const start = mondayOf(berlinToday(now));
  return WEEK_LABELS.map((label, index) => {
    const weekStart = addDays(start, index * 7);
    const weekEnd = addDays(weekStart, 6);
    return {
      start: weekStart,
      end: weekEnd,
      label,
      rangeLabel: formatRange(weekStart, weekEnd),
      isCurrent: index === 0,
    };
  });
}

export function formatRange(start: string, end: string): string {
  const startDate = parseIso(start);
  const endDate = parseIso(end);
  const day = new Intl.DateTimeFormat("de-DE", { day: "numeric", timeZone: "UTC" });
  const month = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "UTC" });
  const sameMonth =
    startDate.getUTCMonth() === endDate.getUTCMonth() &&
    startDate.getUTCFullYear() === endDate.getUTCFullYear();
  if (sameMonth) {
    return `${day.format(startDate)}.–${day.format(endDate)}. ${month.format(endDate)}`;
  }
  return `${day.format(startDate)}. ${month.format(startDate)} – ${day.format(endDate)}. ${month.format(endDate)}`;
}

function parseIso(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
