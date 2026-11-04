/** Short rupiah format: 435_000_000 → "Rp 435 jt", 1_250_000_000 → "Rp 1,25 M". */
export function formatIDR(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${trim(value / 1_000_000_000)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${trim(value / 1_000_000)} jt`;
  }
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export function formatIDRRange(min: number, max: number): string {
  return `${formatIDR(min)} – ${formatIDR(max)}`;
}

function trim(n: number): string {
  return (Math.round(n * 100) / 100).toString().replace('.', ',');
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
