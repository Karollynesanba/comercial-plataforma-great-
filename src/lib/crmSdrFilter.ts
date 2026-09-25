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

// Profiles supply the options. Existing mappings only resolve legacy agendado_por keys.
export function buildCrmSdrOptions(
  profiles: CrmSdrProfile[],
  schedulerOptions: ReadonlyArray<{ value: string; label: string }>,
): CrmSdrOption[] {
  return profiles.map((profile) => {
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
    return {
      value: profile.id,
      label: profile.full_name || profile.email,
      references: [...new Set(aliases.filter(Boolean).map(normalizeReference))],
    };
  }).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export function matchesCrmSdr(
  client: { agendadoPor?: string; assignedSDR?: string },
  sdr: CrmSdrOption | undefined,
): boolean {
  const reference = client.agendadoPor || client.assignedSDR;
  return Boolean(reference && sdr?.references.includes(normalizeReference(reference)));
}
