"""
Gorev 4.11: Uctan Uca Entegrasyon Testi
UC2 tam akis: Vehicle → Compatibility → Reservation → Session Start →
              Session Complete → Cost → Receipt → Wallet Deduction

Strateji: Use-case based system testing (Ch.8)
"""

from datetime import datetime, timedelta
from sqlmodel import select

from app.models.vehicle import Vehicle
from app.models.charger import Charger
from app.models.wallet import Wallet, Transaction
from app.models.notification import Notification
from app.models.digital_receipt import DigitalReceipt
from app.services.compatibility_service import check_compatibility
from app.services.reservation_service import ReservationService
from app.services.session_service import SessionService
from app.schemas.reservation_schema import ReservationCreate


def test_uc2_full_flow(session, test_user, test_vehicle_ccs, test_station, test_charger_ccs, test_wallet):
    """
    UC2 uctan uca: Compatibility → Reserve → Start Charging → Complete → Payment → Receipt.
    Bu tek test tum katmanlari (Service + Repository + Model) entegre eder.
    """

    # ─── 1. Compatibility Check (REQ 7.2) ───
    compat = check_compatibility(test_vehicle_ccs.id, test_charger_ccs.id, session)
    assert compat["is_compatible"] is True

    # ─── 2. Reservation Olustur (REQ 1.9: max 2h) ───
    start_time = datetime.utcnow() + timedelta(minutes=5)
    data = ReservationCreate(
        vehicle_id=test_vehicle_ccs.id,
        station_id=test_station.id,
        charger_id=test_charger_ccs.id,
        start_time=start_time,
        duration_minutes=60,
    )
    reservation = ReservationService.create_reservation(data=data, user=test_user, db=session)
    assert reservation.status == "confirmed"
    assert reservation.id is not None

    # ─── 3. Session Baslat (REQ 1.21: QR kod dogrulama) ───
    cs = SessionService.start_session(
        reservation_id=reservation.id,
        start_battery_level=20.0,
        charger_qr_code=test_charger_ccs.id,
        user_id=test_user.id,
        db=session,
    )
    assert cs.status == "active"
    assert cs.start_battery_level == 20.0

    # Charger occupied olmali
    session.refresh(test_charger_ccs)
    assert test_charger_ccs.status == "occupied"

    # ─── 4. Session Tamamla (REQ 1.13: maliyet hesaplama) ───
    completed = SessionService.complete_session(
        session_id=cs.id,
        end_battery_level=80.0,
        user_id=test_user.id,
        db=session,
    )

    # Maliyet: 75kWh * (80-20)/100 = 45 kWh * 4.0 TL = 180 TL
    assert completed.status == "completed"
    assert completed.energy_consumed == 45.0
    assert completed.total_cost == 180.0
    assert completed.completed_at is not None

    # ─── 5. Charger tekrar available olmali ───
    session.refresh(test_charger_ccs)
    assert test_charger_ccs.status == "available"

    # ─── 6. Reservation completed olmali ───
    session.refresh(reservation)
    assert reservation.status == "completed"
    assert reservation.total_cost == 180.0

    # ─── 7. Wallet Deduction (REQ 4.4: otomatik odeme) ───
    session.refresh(test_wallet)
    assert test_wallet.balance == 320.0  # 500 - 180

    # Transaction kaydi
    txs = list(session.exec(
        select(Transaction).where(
            Transaction.wallet_id == test_wallet.id,
            Transaction.type == "charge",
        )
    ).all())
    assert len(txs) == 1
    assert txs[0].amount == -180.0

    # ─── 8. Receipt Olusturulmus olmali (REQ 1.20) ───
    receipt = session.exec(
        select(DigitalReceipt).where(DigitalReceipt.session_id == cs.id)
    ).first()
    assert receipt is not None
    assert receipt.total_amount == 180.0
    assert receipt.energy_consumed == 45.0
    assert receipt.unit_price == 4.0
    assert receipt.receipt_number.startswith("RCP-")

    # ─── 9. Bildirim gonderilmis olmali ───
    notifications = list(session.exec(
        select(Notification).where(
            Notification.user_id == test_user.id,
            Notification.type == "charging_complete",
        )
    ).all())
    assert len(notifications) == 1
    assert "180.00 TL" in notifications[0].message
