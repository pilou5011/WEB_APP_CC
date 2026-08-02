const FISCAL_CLOSING_REFERENCE_YEAR = 2000;

export function fiscalClosingPartsToDateInput(
  month: number | null | undefined,
  day: number | null | undefined
): string {
  if (typeof month !== 'number' || typeof day !== 'number') {
    return '';
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }

  return `${FISCAL_CLOSING_REFERENCE_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function dateInputToFiscalClosingParts(
  value: string
): { month: number; day: number } | null {
  if (!value) return null;

  const [, monthStr, dayStr] = value.split('-');
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { month, day };
}

export function formatFiscalClosingDate(
  month: number | null | undefined,
  day: number | null | undefined
): string | null {
  if (typeof month !== 'number' || typeof day !== 'number') {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

export function hasFiscalClosingDate(
  month: number | null | undefined,
  day: number | null | undefined
): boolean {
  return formatFiscalClosingDate(month, day) !== null;
}
