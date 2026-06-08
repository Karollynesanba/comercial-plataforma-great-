export function stripMeetingTitlePrefix(value?: string | null) {
  const text = String(value || '').trim();
  if (!text) return '';

  let current = text;
  while (true) {
    const normalized = current.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (!normalized.startsWith('reuniao com ')) {
      break;
    }

    current = current.replace(/^\s*reuni[aã]o\s+com\s+/i, '').trim();
    if (!current) break;
  }

  return current.trim();
}

export function normalizeMeetingTitle(value?: string | null) {
  const cleanValue = stripMeetingTitlePrefix(value);
  return cleanValue ? `Reuniao com ${cleanValue}` : '';
}

export function normalizeMeetingClientName(value?: string | null) {
  return stripMeetingTitlePrefix(value);
}

export function matchMeetingName(value?: string | null) {
  return stripMeetingTitlePrefix(value).toLowerCase();
}

export function isDefaultMeetingTitle(title?: string | null, clientName?: string | null) {
  const cleanClientName = normalizeMeetingClientName(clientName);
  if (!cleanClientName) return false;
  return normalizeMeetingTitle(title) === `Reuniao com ${cleanClientName}`;
}

export function isCustomMeetingTitle(title?: string | null, clientName?: string | null) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return false;
  return !isDefaultMeetingTitle(cleanTitle, clientName);
}
