"""Smoke test — conftest fixture'larinin dogru calistigini dogrular."""


def test_session_creates_tables(session):
    """SQLite in-memory DB'de tablolar olusturulmus olmali."""
    from sqlmodel import SQLModel
    tables = list(SQLModel.metadata.tables.keys())
    assert len(tables) >= 10


def test_user_fixture(test_user):
    assert test_user.id is not None
    assert test_user.email == "driver@test.com"
    assert test_user.role == "driver"


def test_vehicle_ccs_fixture(test_vehicle_ccs):
    assert test_vehicle_ccs.connector_type == "CCS"
    assert test_vehicle_ccs.battery_capacity == 75.0


def test_charger_ccs_fixture(test_charger_ccs):
    assert test_charger_ccs.connector_type == "CCS"
    assert test_charger_ccs.pricing_per_kwh == 4.0


def test_station_fixture(test_station):
    assert test_station.status == "active"


def test_reservation_fixture(test_reservation):
    assert test_reservation.status == "confirmed"


def test_wallet_fixture(test_wallet):
    assert test_wallet.balance == 500.0
