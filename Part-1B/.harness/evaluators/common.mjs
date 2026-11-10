export function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function isDateValid(dateStr, meetingDateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const m = new Date(meetingDateStr);
  if (isNaN(d.getTime()) || isNaN(m.getTime())) return false;
  const diffDays = (d - m) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 366;
}
