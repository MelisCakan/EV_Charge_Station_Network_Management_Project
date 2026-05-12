"""
Gorev 4.6: Reservation Tests (Component Testing)
TC-05 ~ TC-08: Sure siniri, ileri tarih siniri, cakisma engeli, basarili rezervasyon.

Test edilen fonksiyon: ReservationService.create_reservation() — reservation_service.py
Strateji: Boundary Value Testing + Guideline-based Testing
"""

import pytest
from datetime import datetime, timedelta
from fastapi import HTTPException

from app.services.reservation_service import ReservationService
from app.schemas.reservation_schema import ReservationCreate


# ─── TC-05: 2 Saat Siniri (Defect Test — Boundary Value) ───

def test_tc05_max_2_hours(session, test_user, test_vehicle_ccs, test_station, test_charger_ccs):
    """
    TC-05: duration_minutes=180 (3 saat) → HTTPException 400.
    REQ 1.9: Maximum 2 saat siniri.
    Boundary: 120 dk sinirinin ustu.
    """
    data = ReservationCreate(
        vehicle_id=test_vehicle_ccs.id,
        station_id=test_station.id,
        charger_id=test_charger_ccs.id,
        start_time=datetime.utcnow() + timedelta(minutes=10),
        duration_minutes=180,
    )

    with pytest.raises(HTTPException) as exc:
        ReservationService.create_reservation(data=data, user=test_user, db=session)

    assert exc.value.status_code == 400
    assert "Maximum reservation duration is 2 hours" in exc.value.detail


# ─── TC-06: 72 Saat Ileri Siniri (Defect Test — Boundary Value) ───

def test_tc06_max_72_hours_advance(session, test_user, test_vehicle_ccs, test_station, test_charger_ccs):
    """
    TC-06: start_time = now + 96 saat → HTTPException 400.
    Boundary: 72 saat sinirinin ustu.
    """
    data = ReservationCreate(
        vehicle_id=test_vehicle_ccs.id,
        station_id=test_station.id,
        charger_id=test_charger_ccs.id,
        start_time=datetime.utcnow() + timedelta(hours=96),
        duration_minutes=60,
    )

    with pytest.raises(HTTPException) as exc:
        ReservationService.create_reservation(data=data, user=test_user, db=session)

    assert exc.value.status_code == 400
    assert "Cannot reserve more than 72 hours in advance" in exc.value.detail


# ─── TC-07: Cift Rezervasyon Engeli (Defect Test — Conflict) ───

def test_tc07_double_booking(session, test_user, test_user_2, test_wallet, test_wallet_user2, test_vehicle_ccs, test_station, test_charger_ccs):
    """
    TC-07: Ayni charger, cakisan saat → HTTPException 409.
    Guideline-based: Conflict handling.
    """
    start = datetime.utcnow() + timedelta(minutes=10)

    # Ilk rezervasyon (basarili)
    data1 = ReservationCreate(
        vehicle_id=test_vehicle_ccs.id,
        station_id=test_station.id,
        charger_id=test_charger_ccs.id,
        start_time=start,
        duration_minutes=60,
    )
    ReservationService.create_reservation(data=data1, user=test_user, db=session)

    # Ikinci kullanici icin arac olustur
    from app.models.vehicle import Vehicle
    vehicle2 = Vehicle(
        user_id=test_user_2.id,
        brand="BMW",
        model="i4",
        battery_capacity=80.0,
        connector_type="CCS",
        plate_number="34CONF01",
    )
    session.add(vehicle2)
    session.commit()
    session.refresh(vehicle2)

    # Cakisan rezervasyon (30 dk sonra baslar, cakisiyor)
    data2 = ReservationCreate(
        vehicle_id=vehicle2.id,
        station_id=test_station.id,
        charger_id=test_charger_ccs.id,
        start_time=start + timedelta(minutes=30),
        duration_minutes=60,
    )

    with pytest.raises(HTTPException) as exc:
        ReservationService.create_reservation(data=data2, user=test_user_2, db=session)

    assert exc.value.status_code == 409
    assert "already reserved" in exc.value.detail


# ─── TC-08: Basarili Rezervasyon (Validation Test) ───

def test_tc08_successful_reservation(session, test_user, test_wallet, test_vehicle_ccs, test_station, test_charger_ccs):
    """
    TC-08: Gecerli parametreler → confirmed reservation.
    Validation: Temel is akisi dogrulama.
    """
    data = ReservationCreate(
        vehicle_id=test_vehicle_ccs.id,
        station_id=test_station.id,
        charger_id=test_charger_ccs.id,
        start_time=datetime.utcnow() + timedelta(minutes=10),
        duration_minutes=60,
    )

    result = ReservationService.create_reservation(data=data, user=test_user, db=session)

    assert result.status == "confirmed"
    assert result.user_id == test_user.id
    assert result.charger_id == test_charger_ccs.id
    assert result.vehicle_id == test_vehicle_ccs.id
    assert result.id is not None
    assert result.total_cost == 50.0
