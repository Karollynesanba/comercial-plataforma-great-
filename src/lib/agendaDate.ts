import { format } from 'date-fns';

export function normalizeAgendaDateKey(value?: string | null) {
  if (!value) return '';

  const text = String(value).trim();
  if (!text) return '';

  const brazilianDateMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brazilianDateMatch) {
    const [, day, month, year] = brazilianDateMatch;
    return `${year}-${month}-${day}`;
  }

  const isoDateMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  const compactDateMatch = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactDateMatch) {
    const [, year, month, day] = compactDateMatch;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';

  return format(parsed, 'yyyy-MM-dd');
}

export function normalizeAgendaTimeKey(value?: string | null) {
  if (!value) return '';

  const text = String(value).trim();
  if (!text) return '';

  const directTimeMatch = text.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (directTimeMatch) {
    const [, hours, minutes, seconds = '00'] = directTimeMatch;
    return `${hours}:${minutes}:${seconds}`;
  }

  const dateTimeMatch = text.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (dateTimeMatch) {
    const [, hours, minutes, seconds = '00'] = dateTimeMatch;
    return `${hours}:${minutes}:${seconds}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';

  return format(parsed, 'HH:mm:ss');
}

export function normalizeAgendaColor(value?: string | null) {
  if (!value) return '';

  const text = String(value).trim();
  if (!text) return '';

  return text.toUpperCase();
}
