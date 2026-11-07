function localCalendarDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function calculateDueDate(
  issueDate: Date,
  timeZone: string,
  loanDays = 14,
): string {
  if (!Number.isInteger(loanDays) || loanDays < 1) {
    throw new RangeError('loanDays must be a positive integer');
  }
  const [year, month, day] = localCalendarDate(issueDate, timeZone).split('-').map(Number);
  const due = new Date(Date.UTC(year, month - 1, day + loanDays));
  return `${due.getUTCFullYear()}-${String(due.getUTCMonth() + 1).padStart(2, '0')}-${String(due.getUTCDate()).padStart(2, '0')}`;
}

export function todayInTimeZone(timeZone: string, now = new Date()): string {
  return localCalendarDate(now, timeZone);
}
