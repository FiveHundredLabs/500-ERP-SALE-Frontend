export function moneyToNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function moneyToApi(value: string | number | null | undefined): string {
  return moneyToNumber(value).toFixed(2);
}
