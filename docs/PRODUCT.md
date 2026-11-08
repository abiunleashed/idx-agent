# Ürün notları ve yol haritası

## Tek cümlelik tanım
Endonezya'da araba almak isteyen birine, o arabanın gerçek sahiplerinin **ödediği fiyatı** ve **"parasına değdi mi?"** cevabını tek sayfada gösteren, reklamsız bir platform.

## Neden araba ve neden Endonezya
- Araba pahalı bir alım. Pişmanlık maliyeti yüksek olduğu için insanlar almadan önce araştırma yapıyor.
- Bugünkü kaynakların sorunları var. YouTube'daki incelemeler kısa süreli test sürüşlerine dayanıyor ve çoğu sponsorlu. OLX ilan sitesi; sahiplerin uzun süreli deneyimini göstermiyor ve reklamla dolu.
- Pazarda Avanza, Xenia, Innova ve Xpander gibi az sayıda ama çok satan model var. Bu yüzden ilk etapta yaklaşık 30–40 modelle pazarın büyük kısmı kapsanabilir.

## Değişmez ilkeler
1. **Reklam yok, ücretli yorum yok.** Markalardan para alınırsa güven biter.
2. **Olumsuz yorumlar markanın talebiyle silinmez.** Sadece hakaret ve kişisel bilgi içerenler kaldırılır.
3. **Gerçek ödenen fiyat esastır.** Broşür fiyatı yalnızca karşılaştırma için gösterilir.
4. **Örnek veya uydurma yorum yayında asla gerçekmiş gibi gösterilmez.**

## Dürüst risk listesi
| Risk | Neden önemli | Plan |
|---|---|---|
| **Boş platform (cold start)** | Yorum olmazsa kullanıcı gelmez, kullanıcı gelmezse yorum olmaz. En büyük risk bu. | İlk 200–300 yorumu elle topla: kendi çevren, araba Facebook grupları, Kaskus, araç sahibi kulüpleri (ör. Innova Community, Xpander Club). |
| **Sahte yorum** | Bayiler kendi arabalarını övüp rakipleri kötüleyebilir. | "Doğrulanmış alıcı" rozeti (STNK veya fatura fotoğrafı, kişisel bilgiler gizlenmiş), hesap başına model başına tek yorum, şüpheli davranış tespiti. |
| **Hukuki risk** | Endonezya'da ITE yasası kapsamında markalar olumsuz yorumlar için şikayet açabiliyor. | Kullanım şartları, "kişisel deneyim" çerçevesi, moderasyon kuralları. **Yayından önce yerel bir avukata danışılmalı.** |
| **Kişisel veri** | Endonezya'nın kişisel veri koruma yasası (UU PDP) yürürlükte. STNK fotoğrafları hassas veri. | Doğrulama fotoğrafı saklanmaz; onaydan sonra silinir. |
| **Gelir modeli** | Reklam olmayacaksa nereden para gelecek? | Ancak trafik oluştuktan sonra düşünülür. Seçenekler: kullanıcıya premium rapor (ör. "bu fiyat iyi mi?" analizi), ikinci el alıcısına ekspertiz/sigorta yönlendirmesi (açıkça etiketlenmiş). Markaya veri satmak yorum yazanların güvenini sarsabilir. |

## Yol haritası

**Aşama 0: prototip** ✅

**Aşama 1: gerçek kullanıcılarla ilk sürüm (kapalı beta)**
- [x] Sunucu: Supabase (veritabanı, güvenlik kuralları, fotoğraf depolama)
- [x] E-posta + şifre ile kayıt/giriş
- [x] Yorum yazma, düzenleme, silme (fotoğraflar dahil); hesap başına araba başına tek yorum
- [x] Beğen/beğenme oyları (hesap başına tek oy)
- [ ] **Gerçek iPhone'da test** (Expo Go)
- [ ] Kendi e-posta servisi (SMTP) + alan adı → sonra "şifremi unuttum"u aç (kodu hazır, kapalı)
- [ ] E-posta onayını yeniden aç (şu an beta için kapalı)
- [x] Yorum bildirme butonu + moderasyon ekranı (moderatör: bildirilen yorumu gizle / bildirimi yok say)
- [ ] Hesap silme özelliği; silinen hesabın fotoğraf dosyalarının da otomatik silinmesi
- [x] Dil seçiminin kalıcı olması
- [x] Fotoğraf sıkıştırma (en uzun kenar 1600 px, JPEG)
- [ ] Gerçek, tarihli fiyat kaynağı
- [ ] Google / Apple / telefon numarası ile giriş
- [ ] Kullanım şartları ve gizlilik politikası (mağaza için zorunlu)
- [ ] Ayrı model kayıtları: varyant (G/V/Q, HV), yıl, vites tipi

**Aşama 2: güven ve keşif**
- Doğrulanmış alıcı rozeti.
- Benzer şikayetlerin gruplanması (ör. "pintu ringan" ve "pintunya tipis" aynı sorun sayılsın). Yapay zekayla özet: "Sahiplerin %40'ı kapılardan şikayet ediyor".
- Model karşılaştırma (Avanza ve Xpander yan yana).
- Kullanım süresine göre görünüm: 6. aydaki ve 3. yıldaki memnuniyet farkı.
- Mağaza yayını (EAS Build ile App Store ve Google Play).

**Aşama 3: genişleme**
- Başka ülkeler (Malezya, Filipinler, Tayland). Aynı arabanın farklı pazarlardaki adlarını eşleştirmek gerekecek: Innova Zenix = Innova Hycross.
- Para birimi ve yıl farkını hesaba katan ülke karşılaştırması.
- Yeni kategoriler (motosiklet Endonezya'da çok büyük bir pazar, sonra telefon).

## Ölçülecek şeyler (yatırımcıya gösterilecekler)
- Haftalık yeni yorum sayısı ve fotoğraflı yorumların oranı.
- Araba sayfasını açanların ne kadarının sayfada 30 saniyeden fazla kaldığı.
- Yorum yazanların ne kadarının 30 gün sonra hâlâ aktif olduğu.
- En az 10 yorumu olan model sayısı (kapsama).
