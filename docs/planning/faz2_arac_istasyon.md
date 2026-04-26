# Faz 2: Arac Kaydi ve Istasyon Harita Modulu
**Tarih:** 21-27 Nisan 2026
**Hedef:** UC1'in ilk yarisi. Arac CRUD, istasyon katalogu, harita marker, filtreleme, uyumluluk kontrolu.

---

## Yigit - Compatibility Service & Core API

### Gorev 2.1: Vehicle Router (Layer 2)
- [ ] `app/routers/vehicle_router.py`
  - GET /vehicles → kullanicinin araclari
  - POST /vehicles → yeni arac kaydi
  - GET /vehicles/{id} → arac detayi
  - PUT /vehicles/{id} → arac guncelle
  - DELETE /vehicles/{id} → arac sil
- [ ] `app/schemas/vehicle_schema.py`
  ```python
  class VehicleCreate(SQLModel):
      brand: str
      model: str
      battery_capacity: float
      connector_type: str  # CCS | CHAdeMO | Type2
      plate_number: str

  class VehicleRead(SQLModel):
      id: int
      brand: str
      model: str
      battery_capacity: float
      connector_type: str
      plate_number: str
      created_at: datetime
  ```

### Gorev 2.2: Station Router (Layer 2)
- [ ] `app/routers/station_router.py`
  - GET /stations → tum istasyonlar (filtrelenebilir)
  - GET /stations/{id} → istasyon detayi
  - GET /stations/{id}/chargers → istasyonun charger'lari

### Gorev 2.3: Compatibility Service (Layer 3) - REQ 7.2
- [ ] `app/services/compatibility_service.py`
  - **Uyumluluk Kurali (REQ 7.2):** Aracin connector_type (CCS/CHAdeMO/Type2) ile Charger'in connector_type birebir eslesmelidir. Eslesmeme → rezervasyon reddedilir.
  ```python
  async def check_compatibility(vehicle_id: int, charger_id: int, session) -> dict:
      vehicle = await session.get(Vehicle, vehicle_id)
      charger = await session.get(Charger, charger_id)

      # REQ 7.2: connector_type birebir eslesmeli
      connector_match = vehicle.connector_type == charger.connector_type

      return {
          "is_compatible": connector_match,
          "vehicle_connector": vehicle.connector_type,
          "charger_connector": charger.connector_type,
          "message": "Uyumlu" if connector_match else f"{vehicle.connector_type} ile {charger.connector_type} uyumsuz"
      }
  ```

---

## Orcun - Reservation Service

### Gorev 2.4: Reservation Service (Layer 3) - 3 Is Kurali
- [ ] `app/services/reservation_service.py`
  ```python
  async def create_reservation(data, user_id, session):
      # KURAL 1: Maks 2 saat
      duration = (data.end_time - data.start_time)
      if duration > timedelta(hours=2):
          raise HTTPException(400, "Maksimum 2 saat")

      # KURAL 2: Maks 24 saat onceden
      reservation_datetime = datetime.combine(data.date, data.start_time)
      if reservation_datetime - datetime.now() > timedelta(hours=24):
          raise HTTPException(400, "Maksimum 24 saat onceden")

      # KURAL 3: Cakisma engeli
      conflict = session.exec(
          select(Reservation).where(
              Reservation.charger_id == data.charger_id,
              Reservation.date == data.date,
              Reservation.status == "confirmed",
              Reservation.start_time < data.end_time,
              Reservation.end_time > data.start_time
          )
      ).first()
      if conflict:
          raise HTTPException(409, "Bu slot dolu")

      # Uyumluluk kontrolu
      compat = await check_compatibility(data.vehicle_id, data.charger_id, session)
      if not compat["is_compatible"]:
          raise HTTPException(400, compat["message"])

      # Rezervasyon olustur
      reservation = Reservation(
          user_id=user_id,
          vehicle_id=data.vehicle_id,
          charger_id=data.charger_id,
          date=data.date,
          start_time=data.start_time,
          end_time=data.end_time,
          status="confirmed"
      )
      session.add(reservation)
      session.commit()
      return reservation
  ```

### Gorev 2.5: Reservation Router (Layer 2) - REQ 1.18, 1.19
- [ ] `app/routers/reservation_router.py`
  - POST /reservations → yeni rezervasyon
  - GET /reservations/my → kullanicinin rez'lari
  - GET /reservations/{id} → rez detayi
  - DELETE /reservations/{id} → rez iptal (REQ 1.18: >=30dk once → %100 iade, <30dk → %80 iade (%20 ceza), baslangictan sonra iptal yok)
- [ ] `app/schemas/reservation_schema.py`
- [ ] No-show kontrolu (REQ 1.19): Scheduled task veya endpoint - baslangictan 15 dk sonra session baslatilmamissa otomatik iptal, %50 ceza, charger serbest birak

---

## Melis - Frontend: Vehicle & Station Pages

### Gorev 2.6: Arac Kayit Sayfasi (Form Fill-in)
- [ ] `src/app/vehicles/page.tsx` → kayitli araclar listesi
- [ ] `src/app/vehicles/new/page.tsx` → arac kayit formu
  - brand, model, battery_capacity (kWh), connector_type (dropdown: CCS/CHAdeMO/Type2), plate_number
  - Form validasyon (required fields, plate format)
  - POST /vehicles API call

### Gorev 2.7: Istasyon Detay & Filter
- [ ] `src/app/stations/[id]/page.tsx`
  - Istasyon bilgileri (isim, adres, calisma saatleri)
  - Charger listesi (Menu Selection: charger sec)
  - Her charger: chargerType, powerOutput, connectorType, pricingPerKWh, status (renk kodlu badge)
- [ ] `src/components/map/FilterPanel.tsx`
  - Konnektor tipi filtresi (CCS/CHAdeMO/Type2)
  - Guc cikisi filtresi (22kW/50kW/150kW)
  - Fiyat filtresi (maks TL/kWh ust limit slider, aralik: 0-50 TL/kWh)
  - Durum filtresi (available only toggle)

---

## G. Ege - Maps: Markers & Filtering

### Gorev 2.8: Station Markers (Colour Coding - Ch.7)
- [ ] `src/components/map/StationMarker.tsx`
  - Renk kodlu marker (REQ 1.3): Yesil (#22C55E) = Available (en az 1 charger musait), Sari (#EAB308) = Occupied (tumu dolu ama aktif), Kirmizi (#EF4444) = Offline (bakim/ariza nedeniyle devre disi)
  - Marker tiklama → InfoWindow (istasyon adi, charger sayisi, mesafe)
  - InfoWindow'dan detay sayfasina yonlendirme

### Gorev 2.9: Distance Calculation & Filter Sync
- [ ] Distance Matrix API → her istasyona mesafe
- [ ] FilterPanel <-> MapView senkronizasyonu
  - Filtre degistiginde marker'lar guncellenir
  - Sadece uygun istasyonlar gosterilir

---

## Faz 2 Tamamlanma Kriterleri
- [ ] Arac kaydi calisiyor (CRUD)
- [ ] Istasyon listesi ve detay sayfasi calisiyor
- [ ] Haritada renk kodlu marker'lar gorunuyor (REQ 1.3: Yesil/Sari/Kirmizi)
- [ ] Filtreleme calisiyor (konnektor, guc, fiyat maks slider REQ 1.5)
- [ ] Uyumluluk kontrolu calisiyor (REQ 7.2: connector_type eslesmesi)
- [ ] Rezervasyon olusturma 3 is kurali ile calisiyor
- [ ] Cakisma durumunda hata donuyor
- [ ] Rezervasyon iptali calisiyor (REQ 1.18: ceza kurallari)
- [ ] No-show kontrolu tanimli (REQ 1.19: 15dk + %50 ceza)
