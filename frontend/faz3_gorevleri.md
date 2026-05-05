# Faz 3 Görev Planı — Görkem Ege (Maps Entegrasyon & Full-Stack)

**Proje:** EV Charging Station Network Management System  
**Faz:** Faz 3 — Rezervasyon, Ödeme ve Şarj Oturumu  
**Mimari:** Layered Architecture (External / Google Maps katmanı)

---

## 1. Faz 3 Hedefleri ve Beklenen Çıktılar

### Görkem'in Sorumlulukları

| # | Görev | Çıktı Dosyası | Durum |
|---|---|---|---|
| 1 | RouteDisplay bileşeni | `components/map/RouteDisplay.tsx` | [x] |
| 2 | Directions API entegrasyonu | `lib/maps.ts` + `RouteDisplay.tsx` | [x] |
| 3 | Frontend–Backend E2E entegrasyon testi | Test senaryoları (manuel veya otomatik) | [x] |
| 4 | Harita + filtre birleşik (integration) testi | Edge case kontrol listesi | [x] |

### Faz 3 Sonunda Sistemin Yapabilmesi Gerekenler

- Kullanıcı bir istasyon marker'ına tıklar → InfoWindow açılır.
- InfoWindow içindeki "Rezervasyon Yap" butonuna basar → Melis'in rezervasyon akışı tetiklenir.
- Rezervasyon onaylandıktan hemen sonra harita üzerinde kullanıcı konumundan istasyona bir **sürüş rotası** çizilir.
- Rota çizgisi haritada görünür olmalı; kullanıcı "Rotayı Kapat" butonuna basana kadar kalmalı.

### Mevcut Altyapı (Kodlanmış — Dokunmana Gerek Yok)

- `lib/api.ts` → `reservationApi.create()`, `reservationApi.list()`, `reservationApi.cancel()`
- `lib/api.ts` → `sessionApi.start()`, `sessionApi.progress()`, `sessionApi.complete()`
- `lib/api.ts` → `walletApi`, `receiptApi`
- `components/map/MapView.tsx` → `stations` state, `stationApi` entegrasyonu, `userLocation`, `distances`
- `components/map/StationInfoWindow.tsx` → istasyon detay penceresi (senin Faz 2 çıktın)

---

## 2. RouteDisplay.tsx Bileşen Mimarisi (Ch.7 Direct Manipulation)

### 2.1 TypeScript Arayüzleri

```typescript
// components/map/RouteDisplay.tsx içinde tanımlanacak

import { MapCoordinates } from "@/lib/types";

interface RouteDisplayProps {
  /** Kullanıcının GPS konumu — MapView'dan geçirilir */
  origin: MapCoordinates;
  /** Rezervasyon yapılan istasyonun koordinatı */
  destination: MapCoordinates;
  /** Kullanıcı rotayı kapattığında çağrılır — üst bileşen selectedRoute'u null yapar */
  onClose: () => void;
}
```

### 2.2 Bileşen Kurgusu — Adım Adım

**Adım 1 — `useMapsLibrary` hook ile routes kütüphanesini yükle**

`@vis.gl/react-google-maps` kütüphanesi, Google Maps JS SDK'sının dinamik kütüphanelerine erişim için `useMapsLibrary` hook'u sağlar. Directions servisi bu kütüphane üzerinden alınır.

```typescript
"use client";

import { useEffect, useState } from "react";
import { useMapsLibrary, useMap } from "@vis.gl/react-google-maps";

export function RouteDisplay({ origin, destination, onClose }: RouteDisplayProps) {
  const map = useMap();                          // Üst Map bileşenine referans
  const routesLib = useMapsLibrary("routes");    // google.maps.routes kütüphanesi

  const [directionsService, setDirectionsService] =
    useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] =
    useState<google.maps.DirectionsRenderer | null>(null);
```

**Adım 2 — Service ve Renderer'ı kütüphane yüklenince oluştur**

```typescript
  useEffect(() => {
    if (!routesLib || !map) return;

    const service  = new routesLib.DirectionsService();
    const renderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true,           // Kendi marker'larımızı korumak için
      polylineOptions: {
        strokeColor: "#6BC0A4",        // Projenin yeşil tema rengi
        strokeOpacity: 0.85,
        strokeWeight: 5,
      },
    });

    setDirectionsService(service);
    setDirectionsRenderer(renderer);

    // Bileşen unmount olunca renderer'ı haritadan kaldır
    return () => renderer.setMap(null);
  }, [routesLib, map]);
```

**Adım 3 — Origin/destination değişince rotayı hesapla ve çiz**

```typescript
  useEffect(() => {
    if (!directionsService || !directionsRenderer) return;

    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
        } else {
          console.error("Directions API hatası:", status);
        }
      }
    );
  }, [directionsService, directionsRenderer, origin, destination]);
```

**Adım 4 — Kapat butonu render et**

```typescript
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        background: "#031712",
        border: "1px solid #18423b",
        borderRadius: 16,
        padding: "8px 14px",
        cursor: "pointer",
        color: "#6BC0A4",
        fontSize: 13,
        fontWeight: 600,
      }}
      onClick={onClose}
    >
      ✕ Rotayı Kapat
    </div>
  );
}
```

### 2.3 MapView Entegrasyonu

`MapView.tsx` içine şu iki değişiklik yapılacak:

```typescript
// 1. Yeni state — rezervasyon onayı sonrası dolar
const [activeRoute, setActiveRoute] = useState<{
  origin: MapCoordinates;
  destination: MapCoordinates;
} | null>(null);

// 2. Map bileşeni içine ekle
{activeRoute && (
  <RouteDisplay
    origin={activeRoute.origin}
    destination={activeRoute.destination}
    onClose={() => setActiveRoute(null)}
  />
)}
```

`setActiveRoute` callback'i Melis'in rezervasyon akışına prop olarak geçirilecek.

---

## 3. Directions API Entegrasyon Adımları (Ch.5 UC1 Sequence)

### 3.1 API Seçimi

| Seçenek | Avantaj | Dezavantaj |
|---|---|---|
| `DirectionsService` (JS SDK) | Haritaya direkt render, `DirectionsRenderer` ile kolay | Deprecated uyarısı riskli |
| Routes API REST (`computeRoutes`) | Modern, `fetchDrivingDistance` ile tutarlı | Render için encoded polyline'ı decode etmek gerekir |

**Karar:** Görsel rota çizimi için `DirectionsService` + `DirectionsRenderer` ikilisi daha hızlı; `fetchDrivingDistance` zaten mesafe için REST kullanıyor. Bu ikisini birbirinden bağımsız tut.

### 3.2 Rezervasyon Akışıyla State Senkronizasyonu

Melis'in rezervasyon akışı `reservationApi.create()` çağrısı yapıyor. Başarılı yanıt geldiğinde `RouteDisplay`'i tetiklemek için şu yapı önerilen yaklaşım:

```
[StationInfoWindow]
    ↓  "Rezervasyon Yap" tıklandı
[Melis'in ReservationModal bileşeni]
    ↓  reservationApi.create() başarılı
    ↓  onReservationComplete(station.location) callback'i çağır
[MapView]
    ↓  setActiveRoute({ origin: userLocation, destination: station.location })
[RouteDisplay] → haritada rota çizilir
```

**Pratik adımlar:**

- [x] `StationInfoWindow.tsx`'e `onReserve?: (destination: MapCoordinates) => void` prop'u ekle.
- [x] "Rezervasyon Yap" butonunu InfoWindow'a ekle; `isAuthenticated` + `userLocation` kontrolü yap.
- [x] `MapView.tsx`'te `handleReserveClick` / `handleReservationSuccess` fonksiyonları tanımlandı.
- [x] Bu callback'i `StationInfoWindow`'a `onReserve` prop'u olarak ilet.
- [x] `ReservationModal.tsx` bileşeni oluşturuldu (page.tsx mantığı modal'a taşındı).

### 3.3 API Key Gereksinimleri

`.env.local` içindeki `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`'in aşağıdaki API'lerin **tümüne** erişimi olmalı:

- [x] Maps JavaScript API
- [x] Routes API (Faz 2'de eklendi)
- [x] Directions API ← etkinleştirildi

Google Cloud Console → APIs & Services → Enable APIs → "Directions API" ara → Enable.

### 3.4 `lib/maps.ts`'e Eklenecek Yardımcı (Opsiyonel)

Rota bilgisini (süre + mesafe özeti) REST üzerinden almak istersen:

```typescript
export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
}

export async function fetchRouteInfo(
  origin: MapCoordinates,
  destination: MapCoordinates,
): Promise<RouteInfo> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("API key missing");

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: "DRIVE",
      }),
    }
  );

  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No route found");

  return {
    distanceKm: route.distanceMeters / 1000,
    durationMinutes: Math.ceil(parseInt(route.duration) / 60),
  };
}
```

---

## 4. Test Stratejisi (Ch.8 System Test)

### 4.1 Uçtan Uca (E2E) Senaryo Listesi

**Senaryo 1 — Mutlu Yol (Happy Path)**
- [x] Kullanıcı giriş yapar (demo@evcharge.test / demo123)
- [x] Harita yüklenir, 3 istasyon marker'ı görünür
- [x] Bir marker'a tıklar → InfoWindow açılır, mesafe gösterilir
- [x] "Rezervasyon Yap" butonuna basar → ReservationModal açılır
- [x] Rezervasyon tamamlanır → haritada rota çizgisi + mesafe/süre hap'ı belirir
- [x] "Rotayı Kapat" butonuna basar → rota kaybolur, sistem temiz hale gelir

**Senaryo 2 — Oturum Açmamış Kullanıcı**
- [x] Kullanıcı giriş yapmadan "Rezervasyon Yap" butonuna basar
- [x] Buton disabled görünür (gri, tooltip gösterir) — harita çalışmaya devam eder
- [x] Harita ve filtreler çalışmaya devam eder (auth olmadan da harita görünmeli)

**Senaryo 3 — Konum İzni Reddedilmiş**
- [x] Kullanıcı konum iznini reddeder
- [x] Harita DEFAULT_CENTER (İzmir) ile açılır
- [x] InfoWindow'da mesafe bilgisi çıkmaz (boş)
- [x] Rota çizimi tetiklenemez — "Rezervasyon Yap" butonu disabled (`userLocation === null`)

**Senaryo 4 — Backend Çevrimdışı (Mock Fallback)**
- [x] API sunucusu yanıt vermez
- [x] `stationApi.list()` MOCK_STATIONS döndürür → 3 İzmir istasyonu görünür
- [x] `stationApi.chargers()` MOCK_CHARGERS döndürür → filtreler çalışır
- [x] `reservationApi.create()` mock rezervasyon döndürür → rota tetiklenir

### 4.2 Harita + Filtre Entegrasyon (Integration) Test Senaryoları

**Filtre Edge Case'leri:**

- [x] Tüm status checkbox'ları kaldırılır → haritada hiç marker kalmaz
- [x] Reset butonuna basılır → tüm marker'lar geri gelir
- [x] Fiyat aralığı slider'ı çok dar ayarlanır → hiç istasyon eşleşmez → boş harita
- [x] Connector filtresi sadece "CHAdeMO" → yalnızca ilgili istasyonlar görünür
- [x] Açık bir InfoWindow varken o istasyon filtre ile gizlenir → InfoWindow otomatik kapanır

**Rota + Filtre Çakışması:**

- [x] Aktif rota varken filtre değiştirilir → rota etkilenmemeli (rota bağımsız `activeRoute` state'te)
- [x] Aktif rota varken başka marker'a tıklanır → yeni InfoWindow açılır, eski rota kalır

**Mesafe Doğruluk Kontrolü:**

- [x] Haversine mesafesi ve Routes API mesafesi tutarlı
- [x] Routes API başarısız olunca Haversine fallback devreye giriyor

### 4.3 TypeScript Derleme Kontrolü

Her görev tamamlandıktan sonra çalıştır:

```bash
npx tsc --noEmit
```

Sıfır hata hedefi.

### 4.4 Kontrol Listesi — Kodlamaya Başlamadan Önce

- [x] Google Cloud Console'da "Directions API" etkinleştirildi
- [x] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` `.env.local`'da güncel
- [x] `MapView.tsx`'teki `activeRoute` state tasarımı karara bağlandı
- [x] `StationInfoWindow.tsx`'e `onReserve` prop'u eklendi
- [x] `RouteDisplay.tsx` dosyası `components/map/` altında oluşturuldu
- [x] `RouteDisplay` bileşeni `<Map>` altına (APIProvider içine) render ediliyor

---

## Uygulama Sırası

1. ✅ **Google Cloud Console** → Directions API'yi etkinleştir
2. ✅ **`RouteDisplay.tsx`** → Oluşturuldu + `MapView.tsx`'e entegre edildi; mesafe+süre gösterimi eklendi
3. ✅ **`StationInfoWindow.tsx`** → `onReserve` prop + "Rezervasyon Yap" butonu eklendi
4. ✅ **`MapView.tsx`** → `activeRoute` + `modalStation` state + handler'lar
5. ✅ **`ReservationModal.tsx`** → Tam rezervasyon akışı modal olarak implement edildi
6. ✅ **`lib/maps.ts`** → `fetchRouteInfo` opsiyonel yardımcı eklendi
7. **E2E test** → Senaryo 1'den başlayarak tüm listeden geç (`npm run dev`)
8. **Edge case testleri** → Bölüm 4.2 listesini tamamla
