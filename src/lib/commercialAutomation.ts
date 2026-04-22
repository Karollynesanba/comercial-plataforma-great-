function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === 'true';
}

export const isCommercialAutomationEnabled = parseBoolean(
  import.meta.env.VITE_ENABLE_COMMERCIAL_AUTOMATION,
  false
);
