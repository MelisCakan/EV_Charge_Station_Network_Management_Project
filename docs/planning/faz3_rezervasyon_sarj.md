# Faz 3: Rezervasyon, Odeme ve Sarj Oturumu
**Tarih:** 28 Nisan - 4 Mayis 2026
**Hedef:** UC1 ve UC2 uctan uca. Rezervasyon akisi, cuzdan, sarj takibi, rota cizimi, dijital makbuz.

---

## Yigit - Session Service & Cost Calculation

### Gorev 3.1: Session Service (Layer 3)
- [ ] `app/services/session_service.py`
  ```python
  async def start_session(reservation_id: int, start_battery_level: float, session):
      reservation = await session.get(Reservation, reservation_id)
      if reservation.status != "confirmed":
          raise HTTPException(400, "Rezervasyon confirmed degil")

      # Charger'i occupied yap
      charger = await session.get(Charger, reservation.charger_id)
      charger.status = "occupied"

      # Oturum olustur
      charging_session = ChargingSession(
          reservation_id=reservation_id,
          start_battery_level=start_battery_level,
          status="active"
      )
      session.add(charging_session)
      session.commit()
      return charging_session

  async def get_progress(session_id: int, session):
      cs = await session.get(ChargingSession, session_id)
      charger = ...  # reservation -> charger
      elapsed = (datetime.utcnow() - cs.started_at).total_seconds()
      # Simulasyon: lineer sarj artisi
      simulated_battery = min(cs.start_battery_level + (elapsed / 60) * 0.5, 100)
      battery_kWh = charger_battery_capacity * (simulated_battery / 100)
      start_kWh = charger_battery_capacity * (cs.start_battery_level / 100)
      energy = battery_kWh - start_kWh
      cost = energy * charger.pricing_per_kwh
      return {
          "current_battery_level": round(simulated_battery, 1),
          "energy_consumed": round(energy, 2),
          "cost_so_far": round(cost, 2),
          "elapsed_seconds": int(elapsed)
      }

  async def complete_session(session_id: int, end_battery_level: float, session):
      cs = await session.get(ChargingSession, session_id)
      reservation = await session.get(Reservation, cs.reservation_id)
      charger = await session.get(Charger, reservation.charger_id)
      vehicle = await session.get(Vehicle, reservation.vehicle_id)

      # Maliyet hesapla (REQ 1.13: devam eden oturum baslangic fiyatiyla hesaplanir)
      energy_consumed = vehicle.battery_capacity * (end_battery_level - cs.start_battery_level) / 100
      total_cost = energy_consumed * charger.pricing_per_kwh

      # Oturumu guncelle
      cs.end_battery_level = end_battery_level
      cs.energy_consumed = round(energy_consumed, 2)
      cs.total_cost = round(total_cost, 2)
      cs.status = "completed"
      cs.completed_at = datetime.utcnow()

      # Charger'i available yap
      charger.status = "available"

      # Rezervasyonu completed yap
      reservation.status = "completed"

      session.commit()
      return cs
  ```

### Gorev 3.2: Session Router (Layer 2) - REQ 1.21, 1.9 amendment
- [ ] `app/routers/session_router.py`
  - POST /sessions/start → {reservation_id, start_battery_level, charger_qr_code} (REQ 1.21: QR kod dogrulamasi - prototipte charger_id eslesmesi ile simule)
  - GET /sessions/{id}/progress → polling endpoint
  - POST /sessions/{id}/complete → {end_battery_level}
- [ ] `app/schemas/session_schema.py`
- [ ] REQ 1.9 amendment: 2 saat dolunca otomatik complete_session cagrisi + bildirim + makbuz

### Gorev 3.3: Digital Receipt Olusturma + Goruntuleme (REQ 1.20)
- [ ] `complete_session` icinde DigitalReceipt olustur:
- [ ] GET /receipts/my → kullanicinin tum makbuzlari (REQ 1.20)
- [ ] GET /receipts/{id} → makbuz detayi (tarih, istasyon, charger, kWh, birim fiyat, toplam, receipt no)
  ```python
  receipt = DigitalReceipt(
      session_id=cs.id,
      total_amount=cs.total_cost,
      energy_consumed=cs.energy_consumed,
      unit_price=charger.pricing_per_kwh
  )
  session.add(receipt)
  ```

---

## Orcun - Wallet & Notification

### Gorev 3.4: Wallet Service (Layer 3)
- [ ] `app/services/wallet_service.py`
  ```python
  async def get_balance(user_id, session) -> float:
      wallet = session.exec(select(Wallet).where(Wallet.user_id == user_id)).first()
      return wallet.balance

  async def topup(user_id, amount, session):
      wallet = ...
      wallet.balance += amount
      transaction = Transaction(wallet_id=wallet.id, amount=amount, type="topup")
      session.add(transaction)
      session.commit()

  async def deduct(user_id, amount, session_id, session):
      wallet = ...
      if wallet.balance < amount:
          raise HTTPException(400, "Yetersiz bakiye")
      wallet.balance -= amount
      transaction = Transaction(
          wallet_id=wallet.id, amount=-amount,
          type="charge", session_id=session_id
      )
      session.add(transaction)
      # REQ 1.15 amendment: bakiye 50 TL altina dustuyse bildirim gonder
      if wallet.balance < 50:
          await notification_service.send_notification(
              user_id, "Cuzdan bakiyeniz 50 TL altina dustu. Lutfen yukleyin.", "low_balance", session
          )
      session.commit()

  async def refund(user_id, amount, session):
      wallet = ...
      wallet.balance += amount
      transaction = Transaction(wallet_id=wallet.id, amount=amount, type="refund")
      session.add(transaction)
      session.commit()
  ```

### Gorev 3.5: Wallet Router (Layer 2)
- [ ] `app/routers/wallet_router.py`
  - GET /wallet/balance
  - POST /wallet/topup → {amount}
  - GET /wallet/transactions → islem gecmisi (son 50)
- [ ] `app/schemas/wallet_schema.py`

### Gorev 3.6: Notification Service (Layer 3)
- [ ] `app/services/notification_service.py`
  ```python
  async def send_notification(user_id, message, type, session):
      # REQ 2.11: Bildirim olay tetiklenmesinden itibaren <=30 saniye icinde iletilir
      notification = Notification(user_id=user_id, message=message, type=type)
      session.add(notification)
      session.commit()
  ```
  > Not: Prototipte bildirimler sadece DB'ye kaydedilir. Push notification yok.
  > REQ 2.11: "immediate" = 30 saniye icinde. DB'ye yazma anliktir, polling/SSE ile teslim.

### Gorev 3.7: Session Complete Entegrasyonu
- [ ] `complete_session` icinde wallet_service.deduct() cagir
- [ ] `complete_session` icinde notification_service cagir
- [ ] Hata durumunda rollback

---

## Melis - Frontend: Reservation, Charging, Wallet

### Gorev 3.8: Rezervasyon Sayfasi
- [ ] `src/app/reservations/page.tsx` → mevcut rez listesi
- [ ] `src/app/reservations/new/page.tsx`
  - Arac secimi (dropdown - Menu Selection)
  - Istasyon haritadan secilmis (onceki sayfadan)
  - Charger secimi (dropdown - Menu Selection)
  - Tarih + saat secimi (date/time picker - Form Fill-in)
  - Uyumluluk kontrolu sonucu gosterimi
  - "Rezervasyon Olustur" butonu

### Gorev 3.9: Sarj Dashboard (Dynamic Information Display)
- [ ] `src/app/charging/[sessionId]/page.tsx`
  - Sarj baslat butonu
  - `src/components/charging/SessionProgress.tsx`
    - Dairesel progress bar (Analogue display) → batarya seviyesi %
    - Sayisal degerler (Digital display) → kWh, TL, sure
    - 5 saniyede bir polling (useEffect + setInterval)
  - "Sarji Tamamla" butonu
  - Sonuc ekrani: energyConsumed, totalCost, receipt

### Gorev 3.10: Cuzdan Sayfasi
- [ ] `src/app/wallet/page.tsx`
  - Mevcut bakiye gosterimi
  - Yukleme formu (Form Fill-in: miktar)
  - Islem gecmisi listesi (topup/charge/refund)

---

## G. Ege - Route Display & Integration

### Gorev 3.11: Rota Cizimi
- [ ] `src/components/map/RouteDisplay.tsx`
  - Google Maps Directions API
  - Baslangic: kullanici konumu
  - Bitis: secilen istasyon
  - Polyline cizimi
  - ETA ve mesafe gosterimi

### Gorev 3.12: Map Router (Layer 2)
- [ ] `app/routers/map_router.py`
  - GET /map/stations?lat=&lng=&radius= → yakin istasyonlar
  - GET /map/directions?origin=&destination= → Google Directions proxy

### Gorev 3.13: Uctan Uca Entegrasyon
- [ ] Frontend → Backend entegrasyon testi
- [ ] UC1 akisi: Vehicle reg → Map → Filter → Select → Reserve → Route
- [ ] UC2 akisi: Start → Progress → Complete → Payment → Receipt

---

## Faz 3 Tamamlanma Kriterleri
- [ ] UC1 uctan uca calisiyor: login(1.16) → arac → harita → rezervasyon → rota
- [ ] UC2 uctan uca calisiyor: QR(1.21) → sarj baslat → takip → tamamla → odeme → makbuz goruntuleme(1.20)
- [ ] Cuzdan yukleme ve bakiye gosterimi calisiyor
- [ ] Uyumluluk hatasi dogru mesaj donduruyor
- [ ] Yetersiz bakiye hatasi calisiyor
- [ ] Dusuk bakiye bildirimi calisiyor (REQ 1.15: <50 TL)
- [ ] DigitalReceipt olusturuluyor ve goruntuleniyor
- [ ] 2 saat dolunca otomatik tamamlama (REQ 1.9 amendment)
- [ ] Rota haritada gorunuyor
