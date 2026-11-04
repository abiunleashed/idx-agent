import type { Car } from '@/types';

/**
 * Starter catalog: popular cars in Indonesia.
 *
 * Prices are APPROXIMATE new OTR Jakarta ranges for illustration only.
 * Before launch they must be replaced with a verified, dated source.
 */
export const CARS: Car[] = [
  { id: 'toyota-innova-zenix', brand: 'Toyota', model: 'Kijang Innova Zenix', bodyType: 'mpv', generation: '2022–sekarang', priceMinIDR: 430_000_000, priceMaxIDR: 640_000_000, tint: '#3B5B7A' },
  { id: 'toyota-avanza', brand: 'Toyota', model: 'Avanza', bodyType: 'mpv', generation: '2021–sekarang', priceMinIDR: 245_000_000, priceMaxIDR: 315_000_000, tint: '#7A6A53' },
  { id: 'toyota-veloz', brand: 'Toyota', model: 'Veloz', bodyType: 'mpv', generation: '2021–sekarang', priceMinIDR: 295_000_000, priceMaxIDR: 345_000_000, tint: '#5E4B6E' },
  { id: 'toyota-fortuner', brand: 'Toyota', model: 'Fortuner', bodyType: 'suv', generation: '2016–sekarang', priceMinIDR: 560_000_000, priceMaxIDR: 760_000_000, tint: '#2F3B35' },
  { id: 'toyota-calya', brand: 'Toyota', model: 'Calya', bodyType: 'lcgc', generation: '2016–sekarang', priceMinIDR: 160_000_000, priceMaxIDR: 190_000_000, tint: '#8C5A44' },
  { id: 'daihatsu-xenia', brand: 'Daihatsu', model: 'Xenia', bodyType: 'mpv', generation: '2021–sekarang', priceMinIDR: 230_000_000, priceMaxIDR: 285_000_000, tint: '#4F6B5B' },
  { id: 'daihatsu-sigra', brand: 'Daihatsu', model: 'Sigra', bodyType: 'lcgc', generation: '2016–sekarang', priceMinIDR: 135_000_000, priceMaxIDR: 185_000_000, tint: '#6B6B3E' },
  { id: 'honda-brio', brand: 'Honda', model: 'Brio', bodyType: 'hatchback', generation: '2018–sekarang', priceMinIDR: 165_000_000, priceMaxIDR: 260_000_000, tint: '#A0473E' },
  { id: 'honda-hrv', brand: 'Honda', model: 'HR-V', bodyType: 'suv', generation: '2022–sekarang', priceMinIDR: 390_000_000, priceMaxIDR: 560_000_000, tint: '#40566B' },
  { id: 'mitsubishi-xpander', brand: 'Mitsubishi', model: 'Xpander', bodyType: 'mpv', generation: '2017–sekarang', priceMinIDR: 265_000_000, priceMaxIDR: 340_000_000, tint: '#56606E' },
  { id: 'mitsubishi-pajero-sport', brand: 'Mitsubishi', model: 'Pajero Sport', bodyType: 'suv', generation: '2015–sekarang', priceMinIDR: 580_000_000, priceMaxIDR: 760_000_000, tint: '#3A3A44' },
  { id: 'suzuki-ertiga', brand: 'Suzuki', model: 'Ertiga Hybrid', bodyType: 'mpv', generation: '2022–sekarang', priceMinIDR: 245_000_000, priceMaxIDR: 330_000_000, tint: '#4A6E73' },
  { id: 'hyundai-creta', brand: 'Hyundai', model: 'Creta', bodyType: 'suv', generation: '2022–sekarang', priceMinIDR: 300_000_000, priceMaxIDR: 480_000_000, tint: '#6E5A3A' },
  { id: 'wuling-air-ev', brand: 'Wuling', model: 'Air ev', bodyType: 'ev', generation: '2022–sekarang', priceMinIDR: 185_000_000, priceMaxIDR: 300_000_000, tint: '#3E7A6A' },
];

export function getCar(id: string | undefined): Car | undefined {
  return CARS.find((c) => c.id === id);
}
