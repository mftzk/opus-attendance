/** Date helpers. Attendance days are plain calendar dates in one time zone. */
const TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Jakarta"

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Today as `YYYY-MM-DD` in the reporting time zone. */
export function today(): string {
  return formatter.format(new Date())
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && formatIso(parsed) === value
}

function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** `2026-09-16` → `Wed, 16 Sep 2026` */
export function formatDisplayDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`))
}

export const timeZone = TIME_ZONE
