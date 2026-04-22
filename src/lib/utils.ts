import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um número como moeda BRL: R$ 1.234,56
 * @param value - Valor numérico
 * @param decimals - Casas decimais (padrão: 2)
 * @param showSymbol - Mostrar "R$ " (padrão: true)
 */
export function formatBRL(value: number, decimals = 2, showSymbol = true): string {
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return showSymbol ? `R$ ${formatted}` : formatted;
}

/**
 * Formata um número como moeda BRL sem centavos: R$ 1.235
 */
export function formatBRLShort(value: number, showSymbol = true): string {
  return formatBRL(Math.round(value), 0, showSymbol);
}

export function normalizeImportedMoneyValue(value: string): number {
  if (!value) return 0;

  const cleaned = value.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return 0;

  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    return Number(normalized) || 0;
  }

  // The CSV may come with decimal dots, e.g. 4181.77 => R$ 4.181,77.
  if (/^-?\d+\.\d{1,2}$/.test(cleaned)) {
    return Number(cleaned) || 0;
  }

  // Plain integers in this export are whole reais, e.g. 5589 => R$ 5.589,00.
  return Number(cleaned.replace(/\./g, '')) || 0;
}
