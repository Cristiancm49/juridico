const dateOnlyFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' });

export function toDateInputValue(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || '';
}

export function formatDateOnly(value, fallback = 'Sin fecha') {
  const normalized = toDateInputValue(value);
  if (!normalized) return fallback;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? fallback : dateOnlyFormatter.format(date);
}
