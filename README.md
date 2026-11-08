# Sepadan

> *Sepadan* (Endonezce): "denk, karşılığını veren". Yani: parasına değdi mi?

Bu, ürün odaklı ve reklamsız bir yorum uygulaması. Arayüzü Pinterest'e benziyor. İlk sürüm **Endonezya'da satılan arabalarla** başlıyor.
Araba sahipleri şunları paylaşır:

- arabayı **gerçekte kaça aldıklarını**,
- **parasına değip değmediğini** ve **tekrar alıp almayacaklarını**,
- konu bazında puanlarını (malzeme/işçilik, konfor, yakıt, servis),
- artılarını ve eksilerini, beğendikleri veya sorun yaşadıkları yerlerin **fotoğraflarıyla** birlikte.

Arabayı almayı düşünen kişi bu bilgilerin özetini tek sayfada görür.

Ürünle ilgili kararlar ve yol haritası: [`docs/PRODUCT.md`](docs/PRODUCT.md)

## Şu an neler çalışıyor (prototip)

| Ekran | Dosya |
|---|---|
| Keşfet akışı: Pinterest tarzı iki sütun, arama ve araç tipi filtresi | `app/src/app/(tabs)/index.tsx` |
| Araba sayfası: ortalama puan, "değdi" yüzdesi, "tekrar alırdım" yüzdesi, ödenen fiyat ile sıfır fiyatının karşılaştırması, konu bazında puan çubukları, en sık geçen artılar/eksiler, fotoğraflar, yorumlar | `app/src/app/car/[id].tsx` |
| Yorum yazma formu (fotoğraf ekleme ve fotoğrafı "iyi"/"sorun" olarak işaretleme dahil) | `app/src/app/review/new.tsx` |
| Hakkında sayfası: ilkeler ve dil seçimi (Endonezce / Türkçe) | `app/src/app/(tabs)/about.tsx` |

**Bilinen sınırlar:**
- Giriş şimdilik e-posta ve şifreyle yapılıyor. Google, Apple ve telefon numarasıyla giriş sonra eklenecek.
- "Contoh / Örnek" etiketli yorumlar uydurma örnek verilerdir ve sadece sunucusuz demo modunda görünür.
- Sıfır fiyat aralıkları yaklaşık değerler. Yayından önce tarihli ve doğrulanmış bir kaynakla değiştirilmeleri gerekiyor.

## Sunucu (Supabase)

Uygulama `app/.env` dosyasındaki Supabase projesine bağlanır. Bu dosyada sadece **publishable** anahtar bulunur; bu anahtar uygulamanın içine konmak için tasarlanmıştır. Veriler, `supabase/migrations/` içindeki güvenlik kurallarıyla korunur.
**Secret / service_role anahtarı bu dosyaya ya da repoya asla konmamalı.**

Yeni bir Supabase projesini kurmak için:
1. **SQL Editor**'de sırayla `supabase/migrations/0001_init.sql` ve `supabase/seed.sql` dosyalarını çalıştır.
2. İlk moderatörü atamak için kendi hesabınla kayıt olduktan sonra SQL Editor'de şunu çalıştır:
   `update profiles set is_moderator = true where id = (select id from auth.users where email = 'SENIN@EPOSTAN');`

**Şifre sıfırlama** kodda hazır ama kapalı. Açmak için: (1) Supabase'e kendi SMTP e-posta servisini bağla, (2) Authentication > Emails > Reset password şablonuna `{{ .Token }}` ekle, (3) `app/.env` içine `EXPO_PUBLIC_PASSWORD_RESET=1` yaz.

Sunucu olmadan, örnek verilerle çalıştırmak için: `EXPO_PUBLIC_SUPABASE_DISABLED=1 npx expo start`

## Kendi telefonunda çalıştırma

Bilgisayarında [Node.js](https://nodejs.org) (LTS sürümü) kurulu olmalı. Telefonuna da **Expo Go** uygulamasını indir (App Store / Google Play).

```bash
cd app
npm install
npx expo start
```

Terminalde bir QR kodu çıkar:
- **iPhone:** Kamera uygulamasıyla QR kodu okut.
- **Android:** Expo Go uygulamasının içinden QR kodu okut.

Tarayıcıda açmak için aynı terminalde `w` tuşuna bas.

## Teknik yapı

- **Expo + React Native + TypeScript.** iOS ve Android için tek kod tabanı. Mağazalara EAS Build ile Mac gerekmeden yükleniyor.
- **Expo Router.** Her ekran `app/src/app/` altında bir dosya.
- Veri modeli: `app/src/types.ts`. Araba kataloğu: `app/src/data/cars.ts`. İstatistik hesapları: `app/src/lib/stats.ts`.
- Kontrol: `cd app && npx tsc --noEmit`
