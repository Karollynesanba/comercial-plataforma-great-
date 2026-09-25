import { getUserByEmail } from '@/lib/userMapping';

export interface CrmSdrProfile {
  id: string;
  full_name: string;
  email: string;
}

export interface CrmSdrOption {
  value: string;
  label: string;
  references: string[];
}

const normalizeReference = (value: string) => value.trim().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').toUpperCase();

// Display names requested for the spreadsheet; stored scheduler keys stay intact.
const SPREADSHEET_SDR_LABELS: Record<string, string> = {
  JOAO_VITOR: 'João Victor',
  XAVIER: 'Pedro Xavier',
};

// Reuse the platform's SDR directory even when profiles are unavailable to local login.
// Database profiles extend that directory without duplicating existing scheduler keys.
export function buildCrmSdrOptions(
  profiles: CrmSdrProfile[],
  schedulerOptions: ReadonlyArray<{ value: string; label: string }>,
): CrmSdrOption[] {
  const options: CrmSdrOption[] = schedulerOptions.map((option) => ({
    ...option,
    label: SPREADSHEET_SDR_LABELS[option.value] || option.label,
    references: [...new Set([option.value, option.label, SPREADSHEET_SDR_LABELS[option.value]]
      .filter(Boolean).map(normalizeReference))],
  }));
  for (const profile of profiles) {
    const legacy = getUserByEmail(profile.email);
    const aliases = [profile.id, profile.email, profile.full_name];
    if (legacy?.agendadorKey) {
      aliases.push(legacy.agendadorKey, legacy.name);
      for (const option of schedulerOptions) {
        if ([legacy.agendadorKey, legacy.name].some((value) =>
          normalizeReference(value) === normalizeReference(option.label))) {
          aliases.push(option.value);
        }
      }
    }
    const references = [...new Set(aliases.filter(Boolean).map(normalizeReference))];
    const existing = options.find((option) => option.references.some((reference) => references.includes(reference)));
    if (existing) {
      existing.references = [...new Set([...existing.references, ...references])];
      continue;
    }
    options.push({
      value: profile.id,
      label: profile.full_name || profile.email,
      references,
    });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export function matchesCrmSdr(
  client: { agendadoPor?: string; assignedSDR?: string },
  sdr: CrmSdrOption | undefined,
): boolean {
  const reference = client.agendadoPor || client.assignedSDR;
  return Boolean(reference && sdr?.references.includes(normalizeReference(reference)));
}
