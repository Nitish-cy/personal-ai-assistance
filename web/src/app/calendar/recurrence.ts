import type { EventFormValues } from "./types";

export function recurrenceToRRule(recurrence: EventFormValues["recurrence"]): string[] | undefined {
  switch (recurrence) {
    case "daily":
      return ["RRULE:FREQ=DAILY"];
    case "weekly":
      return ["RRULE:FREQ=WEEKLY"];
    case "monthly":
      return ["RRULE:FREQ=MONTHLY"];
    default:
      return undefined;
  }
}

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatTimeInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}
