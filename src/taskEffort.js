export function validHours(value) {
  return value === undefined || value === null ||
    (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER);
}

export function parseHours(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!text) return null;
  if (!/^\d+(?:\.\d+)?$/.test(text) || !validHours(Number(text))) {
    throw new Error('Введите неотрицательное число часов, например 2 или 1,5.');
  }
  return Number(text);
}
