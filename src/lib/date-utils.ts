/**
 * Datums-Hilfsfunktionen – kein externes date-lib erforderlich.
 */

/** Formatiert ein Datum als "dd.MM.yyyy HH:mm" */
export function format(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Gibt relativen Abstand zurück, z.B. "in 3 Tagen" */
export function formatDistanceToNow(date: Date): string {
  const now = Date.now();
  const diff = date.getTime() - now;
  const absDiff = Math.abs(diff);
  const isPast = diff < 0;

  const minutes = Math.floor(absDiff / 60_000);
  const hours = Math.floor(absDiff / 3_600_000);
  const days = Math.floor(absDiff / 86_400_000);

  let label: string;
  if (minutes < 1) label = 'gerade eben';
  else if (minutes < 60) label = `${minutes} Min.`;
  else if (hours < 24) label = `${hours} Std.`;
  else label = `${days} Tagen`;

  return isPast ? `vor ${label}` : `in ${label}`;
}

/** Formatiert nur das Datum "dd.MM.yyyy" */
export function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/** Formatiert Datum+Uhrzeit für datetime-local Input */
export function toInputDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
