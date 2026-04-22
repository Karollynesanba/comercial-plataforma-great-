/**
 * Formats a phone number to the standard format: 55XXXXXXXXXXX
 * Accepts various input formats and normalizes them
 * @param phone - Input phone number (can include formatting characters)
 * @returns Formatted phone number with country code 55
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-numeric characters
  let numbers = phone.replace(/\D/g, '');
  
  // If already starts with 55 and has 12-13 digits, it's already formatted
  if (numbers.startsWith('55') && (numbers.length === 12 || numbers.length === 13)) {
    return numbers;
  }
  
  // If starts with 55, remove it to reprocess
  if (numbers.startsWith('55')) {
    numbers = numbers.slice(2);
  }
  
  // Remove leading 0 if present (some people type 081...)
  if (numbers.startsWith('0')) {
    numbers = numbers.slice(1);
  }
  
  // Now we should have DDD + number (10 or 11 digits)
  // 10 digits = landline or old format
  // 11 digits = mobile with 9
  
  // Add country code
  return '55' + numbers;
}

/**
 * Formats a phone number for display: (XX) XXXXX-XXXX
 * @param phone - Phone number in any format
 * @returns Formatted display string
 */
export function formatPhoneForDisplay(phone: string): string {
  const numbers = phone.replace(/\D/g, '');
  
  // Remove country code if present
  let localNumber = numbers;
  if (numbers.startsWith('55')) {
    localNumber = numbers.slice(2);
  }
  
  // Format based on length
  if (localNumber.length === 11) {
    return `(${localNumber.slice(0, 2)}) ${localNumber.slice(2, 7)}-${localNumber.slice(7)}`;
  } else if (localNumber.length === 10) {
    return `(${localNumber.slice(0, 2)}) ${localNumber.slice(2, 6)}-${localNumber.slice(6)}`;
  }
  
  return phone; // Return original if can't parse
}

/**
 * Validates if a phone number is valid for WhatsApp (Brazilian format)
 * @param phone - Phone number to validate
 * @returns true if valid
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const formatted = formatPhoneForWhatsApp(phone);
  // Should be 55 + 10-11 digits = 12-13 total
  return formatted.length >= 12 && formatted.length <= 13;
}

/**
 * Formats phone input as user types: (XX) XXXXX-XXXX
 * @param value - Current input value
 * @returns Formatted input value
 */
export function formatPhoneInput(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * Normaliza um telefone para comparação (remove tudo que não é número e remove o prefixo 55).
 * Útil para comparar entradas com/sem DDI.
 */
export function normalizePhoneForMatch(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits.slice(2) : digits;
}

/**
 * Retorna variantes comuns de armazenamento (com e sem 55) para facilitar matching.
 */
export function getPhoneMatchCandidates(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  const no55 = normalizePhoneForMatch(digits);
  const with55 = no55 ? `55${no55}` : '';

  const set = new Set([digits, no55, with55].filter(Boolean));
  return Array.from(set);
}
