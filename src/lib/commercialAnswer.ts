export type CommercialYesNoMaybe = 'SIM' | 'NAO' | 'NAO_SEI';

export interface CommercialAnswerOption {
  value: CommercialYesNoMaybe;
  label: string;
}

export const COMMERCIAL_YES_NO_MAYBE_OPTIONS: readonly CommercialAnswerOption[] = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
  { value: 'NAO_SEI', label: 'Não sei' },
] as const;

export function normalizeCommercialAnswer(value?: string | null): CommercialYesNoMaybe | undefined {
  if (value == null) return undefined;

  const normalized = String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  switch (normalized) {
    case 'SIM':
      return 'SIM';
    case 'NAO':
    case 'NAO_PERGUNTADO':
    case 'NAO_SEI':
      return 'NAO_SEI';
    default:
      return undefined;
  }
}

export function coerceCommercialAnswer(value?: string | null, fallback: CommercialYesNoMaybe = 'NAO_SEI'): CommercialYesNoMaybe {
  return normalizeCommercialAnswer(value) ?? fallback;
}

export function formatCommercialAnswerLabel(value?: string | null) {
  const normalized = normalizeCommercialAnswer(value);

  switch (normalized) {
    case 'SIM':
      return 'Sim';
    case 'NAO':
      return 'Não';
    case 'NAO_SEI':
      return 'Não sei';
    default:
      return 'Sem informação';
  }
}
