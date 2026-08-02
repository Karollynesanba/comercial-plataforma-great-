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

type AgendaLikeRecord = {
  start?: string | null;
  end?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  raw_record?: Record<string, unknown> | null;
};

function readAgendaField(record: AgendaLikeRecord, keys: string[]) {
  const raw = record.raw_record || {};

  for (const key of keys) {
    const directValue = record[key as keyof AgendaLikeRecord];
    if (typeof directValue === 'string' && directValue.trim()) {
      return directValue;
    }
    if (directValue === true || directValue === false) {
      return String(directValue);
    }

    const rawValue = raw[key];
    if (typeof rawValue === 'string' && rawValue.trim()) {
      return rawValue;
    }
  }

  return '';
}

export function resolveAgendaDateKey(record: AgendaLikeRecord) {
  return normalizeAgendaDateKey(
    readAgendaField(record, ['start', 'date', 'event_date', 'startDate', 'start_date', 'data', 'scheduled_date'])
  );
}

export function resolveAgendaTimeKey(record: AgendaLikeRecord) {
  return normalizeAgendaTimeKey(
    readAgendaField(record, ['start_time', 'event_time', 'end_time', 'time', 'hour', 'horario', 'start'])
  );
}

export function resolveAgendaEndTimeKey(record: AgendaLikeRecord) {
  return normalizeAgendaTimeKey(
    readAgendaField(record, ['end_time', 'end', 'event_end', 'fim'])
  );
}
