# Faz 2 — Maps Entegrasyon Görev Planı (Görkem Ege)

Proje: EV Charge Station Network Management  
Kapsam: Faz 2 → Araç Kaydı ve İstasyon Harita Modülü  
Sorumlu: Görkem Ege (Maps Entegrasyon & Full-Stack)

---

## Görev 1 — StationMarker Renk Kodlaması

**Amaç:** Haritadaki her istasyon marker'ının, istasyonun `status` değerine göre renk alması.  
Renk sözleşmesi (Ch.7 Colour Coding):
- `available` → Yeşil (`bg-green-500`)
- `occupied` → Sarı (`bg-yellow-500`)
- `offline` → Kırmızı (`bg-red-500`)

**Etkilenen Dosyalar:**
- `components/map/StationMarker.tsx` — Sabit `bg-blue-500` kaldırılır, `status`'e göre dinamik renk eklenir.

**Adımlar:**
- [x] `StationMarker.tsx` dosyasını aç.
- [x] `station.status` değerine göre renk belirleyen bir `statusColor` map/lookup nesnesi tanımla.
- [x] `status` değeri boş gelirse fallback olarak gri (`bg-zinc-400`) kullan.
- [x] `<div>` üzerindeki `bg-blue-500` sınıfını `statusColor[station.status]` ile değiştir.
- [x] `mockStations` datasındaki 3 istasyonun farklı status değerlerine (available / occupied / offline) sahip olduğunu doğrula — renk farkı görsel olarak test edilebilir olsun.

---

## Görev 2 — InfoWindow (İstasyon Detay Penceresi)

**Amaç:** Kullanıcı haritada bir marker'a tıkladığında, o istasyona ait temel bilgilerin (isim, bağlantı tipi, güç, fiyat, durum) bir pop-up/overlay içinde gösterilmesi (Ch.7 Direct Manipulation).

**Etkilenen Dosyalar:**
- `components/map/StationMarker.tsx` — `onClick` prop'u ve seçili state yönetimi eklenir.
- `components/map/MapView.tsx` — Seçili istasyonu tutan `selectedStation` state'i eklenir; `InfoWindow` bileşeni buradan render edilir.
- `components/map/StationInfoWindow.tsx` — **Yeni dosya.** İstasyon bilgilerini gösteren UI bileşeni.

**Adımlar:**
- [x] `MapView.tsx` içine `selectedStation` (`MapStation | null`) state'i ekle.
- [x] `StationMarker.tsx`'e `onSelect: (station: MapStation) => void` prop'u ekle; `AdvancedMarker`'ın `onClick` callback'inde çağır.
- [x] `components/map/StationInfoWindow.tsx` dosyasını oluştur.
  - `@vis.gl/react-google-maps`'ten `InfoWindow` bileşenini import et.
  - `position`, `station` ve `onClose` prop'larını al.
  - İstasyon adı, connector tipleri, güç (kW), fiyat (₺/kWh) ve status badge'ini render et.
- [x] `MapView.tsx` içinde `selectedStation` doluysa `<StationInfoWindow>` render et, `onClose`'da state'i `null`'a sıfırla.
- [x] Başka bir marker'a tıklanınca önceki InfoWindow kapanıp yenisi açılsın (tekil seçim).

---

## Görev 3 — Distance Matrix API

**Amaç:** Kullanıcının anlık konumu ile haritadaki her istasyon arasındaki kuş uçuşu / sürüş mesafesinin hesaplanması ve InfoWindow veya filtre panelinde gösterilmesi.

**Etkilenen Dosyalar:**
- `lib/maps.ts` — Mesafe hesaplama yardımcı fonksiyonu eklenir (önce Haversine ile kuş uçuşu, sonra opsiyonel Distance Matrix API entegrasyonu).
- `components/map/MapView.tsx` — Kullanıcı konumu alındıktan sonra mesafeler hesaplanır, state'e yazılır.
- `components/map/StationInfoWindow.tsx` — Hesaplanan mesafe InfoWindow içinde gösterilir.

**Adımlar:**
- [x] `lib/maps.ts` içine `haversineDistance(a: MapCoordinates, b: MapCoordinates): number` fonksiyonu ekle (kilometre cinsinden döner).
- [x] `MapView.tsx` içinde kullanıcı konumu başarıyla alındıktan sonra `mockStations`'ın her biri için mesafeyi hesaplayıp `Record<string, number>` tipinde `distances` state'ine yaz.
- [x] `StationInfoWindow.tsx`'e `distanceKm?: number` prop'u ekle; varsa "X.X km uzakta" olarak göster.
- [x] (Opsiyonel) Google Maps Distance Matrix API'si ile gerçek sürüş mesafesi için `lib/maps.ts` içine `fetchDrivingDistance` async fonksiyonu ekle — API key `.env.local`'dan okunacak.
- [x] Distance Matrix API kullanılıyorsa istek debounce edilsin; kullanıcı harita merkezini her hareket ettirdiğinde yeni istek gönderilmesin.

---

## Görev 4 — Filtre Senkronizasyonu

**Amaç:** Mevcut `FilterPanel` bileşeni (Melis tarafından entegre edilmiş) ile haritadaki marker görünürlüğünün tam senkronizyasyonu. Filtre değiştiğinde haritada yalnızca eşleşen istasyonların marker'ı görünmeli (Ch.5 Context).

**Etkilenen Dosyalar:**
- `components/map/MapView.tsx` — `filteredStations` mantığı ve `FilterPanel` state'i zaten mevcut; status filtresi eksik, eklenecek.
- `components/map/FilterPanel.tsx` — Status filtresi (available / occupied / offline) için yeni bir bölüm eklenecek.

**Adımlar:**
- [x] Mevcut `filteredStations` useMemo'sunun connector, güç ve fiyat filtrelerini doğru çalıştığını test et.
- [x] `FilterPanel.tsx`'e `selectedStatuses` prop'u ekle; Available / Occupied / Offline checkbox grubu olarak render et.
- [x] `MapView.tsx`'teki `filteredStations` useMemo'suna status filtresi koşulunu ekle.
- [x] Renk kodlaması (Görev 1) ile senkronize çalıştığını doğrula: filtre ile gizlenen marker haritadan tamamen kalksın.
- [x] Tüm filtreler temizlendiğinde tüm marker'lar tekrar görünsün (sıfırlama butonu).

---

## Uygulama Sırası

1. **Görev 1** → StationMarker renk kodlaması (bağımsız, hızlı)
2. **Görev 2** → InfoWindow (Görev 1 tamamlandıktan sonra, marker state'ini kullanır)
3. **Görev 4** → Filtre senkronizasyonu (Görev 1'deki status alanını kullanır)
4. **Görev 3** → Distance Matrix (bağımsız lib fonksiyonu, InfoWindow'a bağlanır)

---

## Genel Notlar

- Import alias olarak `@/lib/...` ve `@/components/...` kullan (`src/` yok).
- Client bileşenlerine `"use client"` direktifi ekle.
- Renk kodlaması, InfoWindow ve Distance Matrix Faz 1'e eklenmemiş olmalıydı — bu görevler yalnızca bu plan kapsamında hayata geçirilecek.
- `mockStations` datası (`lib/mockData.ts`) status değerleri içeriyor: station-1 `available`, station-2 `occupied`, station-3 `offline` — renk testleri için hazır.
