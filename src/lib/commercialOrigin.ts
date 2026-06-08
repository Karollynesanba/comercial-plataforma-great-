const UNIDENTIFIED_ORIGIN = 'NAO IDENTIFICADO';

function normalizeText(value?: string | null) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function normalizeCommercialOrigin(value?: string | null) {
  return normalizeText(value);
}

export function isUnidentifiedCommercialOrigin(value?: string | null) {
  return normalizeCommercialOrigin(value) === UNIDENTIFIED_ORIGIN;
}

export function getCommercialLeadOrigin(input: {
  creativeSource?: string | null;
  creative_source?: string | null;
  criativo?: string | null;
  funil?: string | null;
}) {
  const explicitSource = [input.creativeSource, input.creative_source, input.criativo]
    .map((value) => normalizeCommercialOrigin(value))
    .find((value) => value && value !== UNIDENTIFIED_ORIGIN);

  if (explicitSource) {
    return explicitSource;
  }

  const funil = normalizeCommercialOrigin(input.funil);
  if (funil && funil !== UNIDENTIFIED_ORIGIN) {
    return funil;
  }

  return UNIDENTIFIED_ORIGIN;
}

export function getCommercialOriginLabel(value?: string | null) {
  return normalizeCommercialOrigin(value) || UNIDENTIFIED_ORIGIN;
}
