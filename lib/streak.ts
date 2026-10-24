// Dates are local calendar dates as "YYYY-MM-DD"; input may be unsorted and contain duplicates.

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcMs(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): string {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computeStreak(checkInDates: string[], today: string): number {
  const dates = new Set(checkInDates);
  let cursor = dates.has(today) ? toUtcMs(today) : toUtcMs(today) - DAY_MS;
  let count = 0;
  while (dates.has(fromUtcMs(cursor))) {
    count++;
    cursor -= DAY_MS;
  }
  return count;
}
