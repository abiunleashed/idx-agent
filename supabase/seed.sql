-- Starter catalog (same as app/src/data/cars.ts).
-- Prices are APPROXIMATE and must be replaced with a verified, dated source before launch.
insert into public.cars (id, brand, model, body_type, generation, price_min_idr, price_max_idr, price_source, tint) values
  ('toyota-innova-zenix', 'Toyota', 'Kijang Innova Zenix', 'mpv', '2022–sekarang', 430000000, 640000000, 'approximate, unverified', '#3B5B7A'),
  ('toyota-avanza', 'Toyota', 'Avanza', 'mpv', '2021–sekarang', 245000000, 315000000, 'approximate, unverified', '#7A6A53'),
  ('toyota-veloz', 'Toyota', 'Veloz', 'mpv', '2021–sekarang', 295000000, 345000000, 'approximate, unverified', '#5E4B6E'),
  ('toyota-fortuner', 'Toyota', 'Fortuner', 'suv', '2016–sekarang', 560000000, 760000000, 'approximate, unverified', '#2F3B35'),
  ('toyota-calya', 'Toyota', 'Calya', 'lcgc', '2016–sekarang', 160000000, 190000000, 'approximate, unverified', '#8C5A44'),
  ('daihatsu-xenia', 'Daihatsu', 'Xenia', 'mpv', '2021–sekarang', 230000000, 285000000, 'approximate, unverified', '#4F6B5B'),
  ('daihatsu-sigra', 'Daihatsu', 'Sigra', 'lcgc', '2016–sekarang', 135000000, 185000000, 'approximate, unverified', '#6B6B3E'),
  ('honda-brio', 'Honda', 'Brio', 'hatchback', '2018–sekarang', 165000000, 260000000, 'approximate, unverified', '#A0473E'),
  ('honda-hrv', 'Honda', 'HR-V', 'suv', '2022–sekarang', 390000000, 560000000, 'approximate, unverified', '#40566B'),
  ('mitsubishi-xpander', 'Mitsubishi', 'Xpander', 'mpv', '2017–sekarang', 265000000, 340000000, 'approximate, unverified', '#56606E'),
  ('mitsubishi-pajero-sport', 'Mitsubishi', 'Pajero Sport', 'suv', '2015–sekarang', 580000000, 760000000, 'approximate, unverified', '#3A3A44'),
  ('suzuki-ertiga', 'Suzuki', 'Ertiga Hybrid', 'mpv', '2022–sekarang', 245000000, 330000000, 'approximate, unverified', '#4A6E73'),
  ('hyundai-creta', 'Hyundai', 'Creta', 'suv', '2022–sekarang', 300000000, 480000000, 'approximate, unverified', '#6E5A3A'),
  ('wuling-air-ev', 'Wuling', 'Air ev', 'ev', '2022–sekarang', 185000000, 300000000, 'approximate, unverified', '#3E7A6A')
on conflict (id) do nothing;
