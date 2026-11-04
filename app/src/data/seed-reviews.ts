import type { Review } from '@/types';

/**
 * SAMPLE reviews so the prototype isn't empty. Every one is flagged `isDemo`
 * and shown with a "Contoh / Örnek" badge. They must be removed before launch:
 * publishing invented owner reviews as real would destroy the trust the app depends on.
 */
export const SEED_REVIEWS: Review[] = [
  {
    id: 'demo-1', carId: 'toyota-innova-zenix', authorName: 'Pengguna contoh', modelYear: 2023, variant: '2.0 V HV',
    pricePaidIDR: 560_000_000, condition: 'new', city: 'Jakarta', monthsOwned: 18, overall: 3,
    aspects: { buildQuality: 2, comfort: 4, fuel: 5, afterSales: 3 }, worthIt: 'unsure', wouldBuyAgain: false,
    pros: ['Irit untuk ukuran MPV', 'Kabin lega dan senyap'],
    cons: ['Pintu terlalu ringan, harus dibanting 2–3 kali', 'Pelat bodi terasa tipis'],
    body: 'Mesin hybrid-nya irit dan kabinnya nyaman untuk keluarga. Tapi pintunya sangat ringan: sering tidak tertutup rapat dan harus ditutup ulang dengan keras. Untuk harga segini kualitas material bodi mengecewakan.',
    photos: [], createdAt: '2026-09-12', isDemo: true,
  },
  {
    id: 'demo-2', carId: 'toyota-innova-zenix', authorName: 'Pengguna contoh', modelYear: 2024, variant: '2.0 G',
    pricePaidIDR: 450_000_000, condition: 'new', city: 'Surabaya', monthsOwned: 10, overall: 4,
    aspects: { buildQuality: 3, comfort: 5, fuel: 3, afterSales: 4 }, worthIt: 'yes', wouldBuyAgain: true,
    pros: ['Suspensi empuk', 'Bengkel resmi ada di mana-mana'], cons: ['Pintu terasa ringan'],
    body: 'Jauh lebih nyaman dari Innova Reborn. Untuk perjalanan luar kota keluarga sangat enak. Minus kecil di kualitas pintu.',
    photos: [], createdAt: '2026-08-03', isDemo: true,
  },
  {
    id: 'demo-3', carId: 'toyota-avanza', authorName: 'Pengguna contoh', modelYear: 2022, variant: '1.5 G CVT',
    pricePaidIDR: 270_000_000, condition: 'new', city: 'Bandung', monthsOwned: 30, overall: 4,
    aspects: { buildQuality: 3, comfort: 3, fuel: 4, afterSales: 5 }, worthIt: 'yes', wouldBuyAgain: true,
    pros: ['Harga jual kembali tinggi', 'Servis murah'], cons: ['Kabin bising di tol'],
    body: 'Mobil sejuta umat, tidak ada yang istimewa tapi tidak pernah rewel. Biaya servis murah dan suku cadang mudah.',
    photos: [], createdAt: '2026-07-21', isDemo: true,
  },
  {
    id: 'demo-4', carId: 'mitsubishi-xpander', authorName: 'Pengguna contoh', modelYear: 2023, variant: 'Ultimate CVT',
    pricePaidIDR: 325_000_000, condition: 'new', city: 'Medan', monthsOwned: 14, overall: 4,
    aspects: { buildQuality: 4, comfort: 5, fuel: 3, afterSales: 3 }, worthIt: 'yes', wouldBuyAgain: true,
    pros: ['Suspensi paling nyaman di kelasnya', 'Desain modern'], cons: ['Konsumsi BBM dalam kota boros'],
    body: 'Bantingan suspensi enak sekali untuk jalan rusak. Konsumsi BBM dalam kota kurang irit.',
    photos: [], createdAt: '2026-10-02', isDemo: true,
  },
  {
    id: 'demo-5', carId: 'honda-brio', authorName: 'Pengguna contoh', modelYear: 2021, variant: 'RS CVT',
    pricePaidIDR: 205_000_000, condition: 'used', city: 'Yogyakarta', monthsOwned: 20, overall: 5,
    aspects: { buildQuality: 4, comfort: 3, fuel: 5, afterSales: 4 }, worthIt: 'yes', wouldBuyAgain: true,
    pros: ['Lincah dan irit', 'Mudah parkir'], cons: ['Bagasi kecil'],
    body: 'Untuk dalam kota tidak ada lawan. Mesinnya responsif dan irit.',
    photos: [], createdAt: '2026-06-15', isDemo: true,
  },
  {
    id: 'demo-6', carId: 'wuling-air-ev', authorName: 'Pengguna contoh', modelYear: 2023, variant: 'Long Range',
    pricePaidIDR: 290_000_000, condition: 'new', city: 'Jakarta', monthsOwned: 16, overall: 3,
    aspects: { buildQuality: 3, comfort: 2, fuel: 5, afterSales: 2 }, worthIt: 'no', wouldBuyAgain: false,
    pros: ['Biaya listrik sangat murah', 'Bebas ganjil-genap'], cons: ['Harga jual kembali jatuh', 'Bengkel resmi sedikit'],
    body: 'Biaya harian sangat murah, tapi nilai jual kembali turun drastis dan layanan purna jual masih terbatas.',
    photos: [], createdAt: '2026-09-28', isDemo: true,
  },
  {
    id: 'demo-7', carId: 'toyota-fortuner', authorName: 'Pengguna contoh', modelYear: 2022, variant: '2.8 VRZ 4x2',
    pricePaidIDR: 640_000_000, condition: 'new', city: 'Balikpapan', monthsOwned: 36, overall: 4,
    aspects: { buildQuality: 5, comfort: 3, fuel: 3, afterSales: 5 }, worthIt: 'yes', wouldBuyAgain: true,
    pros: ['Tangguh di jalan rusak', 'Harga jual kembali sangat baik'], cons: ['Suspensi belakang keras'],
    body: 'Untuk Kalimantan mobil ini sangat cocok. Bandel dan kuat.',
    photos: [], createdAt: '2026-05-09', isDemo: true,
  },
];
