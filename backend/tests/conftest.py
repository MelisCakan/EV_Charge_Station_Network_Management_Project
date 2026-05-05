"""
Test altyapisi — SQLite in-memory DB ile izole test ortami.
Her test fonksiyonu temiz bir DB session alir.
"""

import pytest
from datetime import datetime, timedelta
from sqlmodel import SQLModel, Session, create_engine

# Tum modelleri import et (SQLModel.metadata'ya kayit olmasi icin)
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.station import ChargingStation
from app.models.charger import Charger
from app.models.reservation import Reservation
from app.models.charging_session import ChargingSession
from app.models.wallet import Wallet, Transaction
from app.models.notification import Notification
from app.models.digital_receipt import DigitalReceipt
from app.models.issue_report import IssueReport
from app.models.maintenance_note import MaintenanceNote


# ─── Engine & Session ───

@pytest.fixture(name="engine")
def fixture_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def fixture_session(engine):
    with Session(engine) as session:
        yield session


# ─── Users ───

@pytest.fixture
def test_user(session):
    user = User(
        email="driver@test.com",
        password_hash="hashedpw123",
        full_name="Test Driver",
        phone_number="5551234567",
        role="driver",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def test_user_2(session):
    user = User(
        email="driver2@test.com",
        password_hash="hashedpw456",
        full_name="Other Driver",
        phone_number="5559876543",
        role="driver",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


# ─── Vehicles ───

@pytest.fixture
def test_vehicle_ccs(session, test_user):
    vehicle = Vehicle(
        user_id=test_user.id,
        brand="Tesla",
        model="Model 3",
        battery_capacity=75.0,
        connector_type="CCS",
        plate_number="34ABC001",
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


@pytest.fixture
def test_vehicle_chademo(session, test_user):
    vehicle = Vehicle(
        user_id=test_user.id,
        brand="Nissan",
        model="Leaf",
        battery_capacity=40.0,
        connector_type="CHAdeMO",
        plate_number="34ABC002",
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


@pytest.fixture
def test_vehicle_type2(session, test_user):
    vehicle = Vehicle(
        user_id=test_user.id,
        brand="BMW",
        model="iX3",
        battery_capacity=50.0,
        connector_type="Type2",
        plate_number="34ABC003",
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


@pytest.fixture
def test_vehicle_small_battery(session, test_user):
    """TC-04: Kucuk batarya kapasiteli arac (40 kWh)."""
    vehicle = Vehicle(
        user_id=test_user.id,
        brand="Fiat",
        model="500e",
        battery_capacity=40.0,
        connector_type="CCS",
        plate_number="34ABC004",
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


# ─── Station ───

@pytest.fixture
def test_station(session):
    station = ChargingStation(
        name="Test Station Alpha",
        latitude=41.0082,
        longitude=28.9784,
        address="Test Caddesi No:1",
        city="Istanbul",
        operating_hours="00:00-23:59",
        status="active",
    )
    session.add(station)
    session.commit()
    session.refresh(station)
    return station


# ─── Chargers ───

@pytest.fixture
def test_charger_ccs(session, test_station):
    charger = Charger(
        station_id=test_station.id,
        charger_code="DC-CCS-01",
        charger_type="DC",
        power_output=150.0,
        connector_type="CCS",
        pricing_per_kwh=4.0,
        status="available",
    )
    session.add(charger)
    session.commit()
    session.refresh(charger)
    return charger


@pytest.fixture
def test_charger_chademo(session, test_station):
    charger = Charger(
        station_id=test_station.id,
        charger_code="DC-CHD-01",
        charger_type="DC",
        power_output=50.0,
        connector_type="CHAdeMO",
        pricing_per_kwh=3.5,
        status="available",
    )
    session.add(charger)
    session.commit()
    session.refresh(charger)
    return charger


@pytest.fixture
def test_charger_type2(session, test_station):
    charger = Charger(
        station_id=test_station.id,
        charger_code="AC-T2-01",
        charger_type="AC",
        power_output=22.0,
        connector_type="Type2",
        pricing_per_kwh=5.0,
        status="available",
    )
    session.add(charger)
    session.commit()
    session.refresh(charger)
    return charger


# ─── Reservation (confirmed, CCS charger ile) ───

@pytest.fixture
def test_reservation(session, test_user, test_vehicle_ccs, test_station, test_charger_ccs):
    now = datetime.utcnow()
    reservation = Reservation(
        user_id=test_user.id,
        vehicle_id=test_vehicle_ccs.id,
        station_id=test_station.id,
        charger_id=test_charger_ccs.id,
        start_time=now,
        end_time=now + timedelta(hours=1),
        status="confirmed",
    )
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    return reservation


# ─── Charging Session (active, start_battery=20%) ───

@pytest.fixture
def test_active_session(session, test_reservation, test_charger_ccs):
    cs = ChargingSession(
        reservation_id=test_reservation.id,
        start_battery_level=20.0,
        status="active",
    )
    session.add(cs)

    # Charger'i occupied yap (session baslatildiginda yapilir)
    test_charger_ccs.status = "occupied"
    session.add(test_charger_ccs)

    # Reservation'i active yap
    test_reservation.status = "active"
    session.add(test_reservation)

    session.commit()
    session.refresh(cs)
    return cs


# ─── Wallet ───

@pytest.fixture
def test_wallet(session, test_user):
    """Default 500 TL bakiye."""
    wallet = Wallet(
        user_id=test_user.id,
        balance=500.0,
    )
    session.add(wallet)
    session.commit()
    session.refresh(wallet)
    return wallet


@pytest.fixture
def test_wallet_low(session, test_user):
    """Yetersiz bakiye: 50 TL (TC-11)."""
    wallet = Wallet(
        user_id=test_user.id,
        balance=50.0,
    )
    session.add(wallet)
    session.commit()
    session.refresh(wallet)
    return wallet


# ─── Operator User (UC3 icin) ───

@pytest.fixture
def test_operator(session):
    user = User(
        email="operator@test.com",
        password_hash="hashedpw789",
        full_name="Test Operator",
        phone_number="5550001111",
        role="operator",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


# ─── Wallet for user_2 (TC-13 icin) ───

@pytest.fixture
def test_wallet_user2(session, test_user_2):
    wallet = Wallet(
        user_id=test_user_2.id,
        balance=300.0,
    )
    session.add(wallet)
    session.commit()
    session.refresh(wallet)
    return wallet


# ─── Future Reservation (TC-13: gelecek tarihli confirmed) ───

@pytest.fixture
def test_future_reservation(session, test_user, test_vehicle_ccs, test_station, test_charger_ccs):
    future = datetime.utcnow() + timedelta(hours=2)
    reservation = Reservation(
        user_id=test_user.id,
        vehicle_id=test_vehicle_ccs.id,
        station_id=test_station.id,
        charger_id=test_charger_ccs.id,
        start_time=future,
        end_time=future + timedelta(hours=1),
        status="confirmed",
    )
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    return reservation


@pytest.fixture
def test_future_reservation_user2(session, test_user_2, test_station, test_charger_ccs):
    """Ayni charger'da ikinci kullanicinin gelecek tarihli reservation'i."""
    vehicle = Vehicle(
        user_id=test_user_2.id,
        brand="Hyundai",
        model="Ioniq 5",
        battery_capacity=72.0,
        connector_type="CCS",
        plate_number="34XYZ999",
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)

    future = datetime.utcnow() + timedelta(hours=4)
    reservation = Reservation(
        user_id=test_user_2.id,
        vehicle_id=vehicle.id,
        station_id=test_station.id,
        charger_id=test_charger_ccs.id,
        start_time=future,
        end_time=future + timedelta(hours=1),
        status="confirmed",
    )
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    return reservation
