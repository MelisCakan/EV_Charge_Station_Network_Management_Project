# Faz 4: Test, Sunum Hazirligi ve Entegrasyon
**Tarih:** 5-9 Mayis 2026
**Hedef:** 13 test case, UC3 (kismen), sunum slaytlari, demo provasi, "not implemented yet" sayfalari.

---

## Yigit - Testing (Ch.8 Uyumlu)

### Gorev 4.1: Compatibility Tests (Unit Testing)
- [ ] `backend/tests/test_compatibility.py`
  ```python
  # TC-01: Konnektor uyumluluk (basarili)
  async def test_compatible_ccs():
      result = await check_compatibility(vehicle_ccs, charger_ccs, session)
      assert result["is_compatible"] == True

  # TC-02: Konnektor uyumluluk (basarisiz)
  async def test_incompatible_ccs_chademo():
      result = await check_compatibility(vehicle_ccs, charger_chademo, session)
      assert result["is_compatible"] == False

  # TC-03: Type2 uyumluluk
  async def test_compatible_type2():
      result = await check_compatibility(vehicle_type2, charger_type2, session)
      assert result["is_compatible"] == True

  # TC-04: Guc uyumluluk
  async def test_power_compatibility():
      # 40kWh battery + 150kW charger = OK
      result = await check_compatibility(vehicle_40kwh, charger_150kw, session)
      assert result["is_compatible"] == True
  ```

### Gorev 4.2: Session Tests (Unit + Validation Testing)
- [ ] `backend/tests/test_session.py`
  ```python
  # TC-09: Maliyet hesaplama
  async def test_cost_calculation():
      # energyConsumed: 45 kWh, pricingPerKWh: 4 TL
      session = await complete_session(session_id, end_battery=80)
      assert session.total_cost == 180.0

  # TC-10: Sifir tuketim
  async def test_zero_consumption():
      session = await complete_session(session_id, end_battery=20)  # same as start
      assert session.energy_consumed == 0.0
      assert session.total_cost == 0.0

  # TC-11: Yetersiz bakiye
  async def test_insufficient_balance():
      # balance: 50 TL, cost: 180 TL
      with pytest.raises(HTTPException) as exc:
          await complete_session(session_id, end_battery=80)
      assert exc.value.status_code == 400
      assert "Yetersiz bakiye" in str(exc.value.detail)

  # TC-12: Otomatik odeme
  async def test_auto_payment():
      # balance: 500 TL, cost: 180 TL
      await complete_session(session_id, end_battery=80)
      wallet = await get_balance(user_id)
      assert wallet == 320.0
  ```

### Gorev 4.3: Bug Fix & Edge Cases
- [ ] Tum endpoint'lerde edge case kontrolleri
- [ ] 404 hatalari (olmayan resource)
- [ ] Yetkilendirme kontrolleri (driver baskasinin aracini goremez)
- [ ] Concurrent reservation conflict handling

---

## Orcun - Maintenance Service (UC3) & Reservation Tests

### Gorev 4.4: Maintenance Service (Layer 3) - UC3
- [ ] `app/services/maintenance_service.py`
  ```python
  async def mark_charger_offline(charger_id: int, session):
      charger = await session.get(Charger, charger_id)
      charger.status = "offline"

      # Tum aktif rez'lari iptal et
      reservations = session.exec(
          select(Reservation).where(
              Reservation.charger_id == charger_id,
              Reservation.status == "confirmed",
              Reservation.date >= date.today()
          )
      ).all()

      for rez in reservations:
          rez.status = "cancelled"
          # REQ 2.4 amendment: Otomatik %100 iade + refund Transaction kaydı
          await wallet_service.refund(rez.user_id, iade_miktari, session)
          # Bildirim gonder (REQ 2.11: <=30 saniye icinde)
          await notification_service.send_notification(
              rez.user_id,
              f"Charger bakim nedeniyle offline. Rezervasyonunuz iptal edildi. Odemeniz iade edildi.",
              "maintenance_cancellation",
              session
          )

      session.commit()
      return {"cancelled_count": len(reservations)}
  ```

### Gorev 4.5: Issue & Admin Router
- [ ] `app/routers/issue_router.py`
  - POST /issues → ariza raporu olustur
  - GET /issues → arizalar listesi (operator/admin)
  - PUT /issues/{id} → durum guncelle
  - POST /issues/{id}/notes → bakim notu ekle

- [ ] `app/routers/admin_router.py`
  - PUT /chargers/{id}/status → offline/available
  - GET /admin/revenue → (stub - not implemented yet)
  - GET /admin/utilization → (stub)
  - GET /admin/peak-hours → (stub)

### Gorev 4.6: Reservation Tests (Component Testing)
- [ ] `backend/tests/test_reservation.py`
  ```python
  # TC-05: 2 saat siniri
  async def test_max_2_hours():
      # start: 14:00, end: 17:00 (3h)
      with pytest.raises(HTTPException) as exc:
          await create_reservation(data_3h, user_id)
      assert exc.value.status_code == 400

  # TC-06: 24 saat siniri
  async def test_max_24_hours_advance():
      # date: bugun + 2 gun
      with pytest.raises(HTTPException) as exc:
          await create_reservation(data_future, user_id)
      assert exc.value.status_code == 400

  # TC-07: Cift rez engeli
  async def test_double_booking():
      # Charger #3, 14:00-16:00 zaten dolu
      with pytest.raises(HTTPException) as exc:
          await create_reservation(data_conflict, user_id)
      assert exc.value.status_code == 409

  # TC-08: Basarili rezervasyon
  async def test_successful_reservation():
      result = await create_reservation(data_valid, user_id)
      assert result.status == "confirmed"
  ```

### Gorev 4.7: Maintenance Test (System Testing)
- [ ] `backend/tests/test_maintenance.py`
  ```python
  # TC-13: Charger offline -> otomatik iptal + iade
  async def test_charger_offline_bulk_cancel():
      # Setup: Charger #3'te 2 confirmed rez var
      result = await mark_charger_offline(charger_id)
      assert result["cancelled_count"] == 2
      # Charger offline
      charger = await session.get(Charger, charger_id)
      assert charger.status == "offline"
      # Iade yapildi
      # ...
  ```

---

## Melis - Sunum & UI Polish

### Gorev 4.8: Sunum Slaytlari
- [ ] Architecture Overview slayti (Ch.6 terminolojisi)
  - Client-Server + Layered Architecture diyagrami
  - Client-Server dagitim modeli + 4 katman eslemesi tablosu
  - System characteristics
- [ ] UI Design Overview slayti (Ch.7 terminolojisi)
  - 4 interaction style ornekleri (ekran goruntuleri)
  - 6 design prensibi ornekleri
  - Information presentation (static/dynamic, colour coding)
- [ ] Testing Overview slayti (Ch.8 terminolojisi)
  - 13 test case tablosu
  - Pytest cikti ekran goruntusu
  - Kod snippet'leri
- [ ] Demo akis slayti

### Gorev 4.9: "Not Implemented Yet" Sayfalari
- [ ] `src/app/favorites/page.tsx`
  ```tsx
  export default function FavoritesPage() {
    return <div className="p-8 text-center">
      <h1>Favori Istasyonlar</h1>
      <p>This function has not been implemented yet.</p>
    </div>
  }
  ```
- [ ] `src/app/history/page.tsx` → ayni sekilde
- [ ] Admin dashboard'da revenue/utilization/peak-hours → "Not Implemented Yet"
- [ ] Notification sayfasi → "Not Implemented Yet"

### Gorev 4.10: UI Polish + Accessibility (REQ 9.7)
- [ ] Tum form validasyonlari
- [ ] Loading state'ler (skeleton/spinner)
- [ ] Error mesajlari (Ch.7 error message prensipleri)
- [ ] Responsive kontrol (mobil gorunum)
- [ ] Consistent styling (shadcn/ui)
- [ ] REQ 9.7 (WCAG 2.1 AA): Renk kontrast orani >=4.5:1, klavye navigasyonu, aria-label'lar

---

## G. Ege - Integration Testing & Demo

### Gorev 4.11: Uctan Uca Entegrasyon Testi
- [ ] UC1 tam akis: Register(1.16) → Login → Vehicle → Map → Filter → Station → Charger → Compatibility → Reserve → Cancel(1.18) → Re-reserve → Route
- [ ] UC2 tam akis: QR Dogrulama(1.21) → Start Charging → Progress (5s polling) → Complete → Payment → Receipt Goruntuleme(1.20)
- [ ] UC3 kismen: Operator login → Charger offline → Check cancellations → Verify refund(2.4)
- [ ] Edge cases: yanlis konnektor, yetersiz bakiye, dolu slot, no-show(1.19), 2h timeout(1.9), dusuk bakiye uyarisi(1.15)

### Gorev 4.12: Demo Provasi
- [ ] 15 dk zamanlama ile demo provasi
- [ ] Sunum sirasi:
  | Zaman | Bolum | Sunan |
  |-------|-------|-------|
  | 0:00-2:30 | Architecture Overview (Client-Server + Layered) | Yigit + Orcun |
  | 2:30-5:00 | UI Design Overview | Melis |
  | 5:00-6:30 | Testing Overview | Yigit + G.Ege |
  | 6:30-9:30 | Demo: UC1 (Reserve) | Melis + G.Ege |
  | 9:30-12:30 | Demo: UC2 (Charge) | Melis + Yigit |
  | 12:30-14:00 | Demo: UC3 (Maintenance) | Orcun |
  | 14:00-15:00 | Q&A | Tum Ekip |
- [ ] Yedek plan: eger API yanit vermezse seed data ile static demo
- [ ] Ekran kaydi (yedek)

---

## Faz 4 Tamamlanma Kriterleri
- [ ] 13 test case (TC-01 ~ TC-13) PASS
- [ ] `pytest --tb=short` tum testler yesil
- [ ] UC3 kismen calisiyor (offline → cancel → refund)
- [ ] Sunum slaytlari hazir (Ch.6 + Ch.7 + Ch.8 terminolojisi)
- [ ] "Not Implemented Yet" sayfalari mevcut
- [ ] 15 dk demo provasi yapildi
- [ ] Sunum tarihi: 10 Mayis 2026
