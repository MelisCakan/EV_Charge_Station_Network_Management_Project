"""Seed script: ornek verilerle veritabanini doldurur (Repository Pattern ile)."""

import bcrypt
from sqlmodel import Session

from app.database import engine, create_db_and_tables
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.station import ChargingStation
from app.models.charger import Charger
from app.models.wallet import Wallet
from app.repositories import (
    UserRepository, VehicleRepository, StationRepository,
    ChargerRepository, WalletRepository,
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def seed():
    create_db_and_tables()

    with Session(engine) as session:
        user_repo = UserRepository(session)
        vehicle_repo = VehicleRepository(session)
        station_repo = StationRepository(session)
        charger_repo = ChargerRepository(session)
        wallet_repo = WalletRepository(session)

        # Check if already seeded
        if user_repo.count() > 0:
            print("Database already seeded, skipping.")
            return

        # --- Users ---
        driver = user_repo.create(User(
            email="driver@test.com",
            password_hash=hash_password("Driver123"),
            full_name="Ahmet Yilmaz",
            phone_number="05551234567",
            role="driver",
        ))
        operator = user_repo.create(User(
            email="operator@test.com",
            password_hash=hash_password("Operator123"),
            full_name="Elif Demir",
            phone_number="05559876543",
            role="operator",
            assigned_region="Izmir",
        ))
        admin = user_repo.create(User(
            email="admin@test.com",
            password_hash=hash_password("Admin123"),
            full_name="System Admin",
            role="admin",
        ))

        # --- Wallets (500 TL each) ---
        for user in [driver, operator, admin]:
            wallet_repo.create(Wallet(user_id=user.id, balance=500.0))

        # --- Vehicles ---
        vehicle_repo.create_many([
            Vehicle(
                user_id=driver.id,
                brand="Tesla",
                model="Model 3",
                battery_capacity=75.0,
                connector_type="CCS",
                plate_number="35 ABC 123",
            ),
            Vehicle(
                user_id=driver.id,
                brand="Nissan",
                model="Leaf",
                battery_capacity=40.0,
                connector_type="CHAdeMO",
                plate_number="35 DEF 456",
            ),
        ])

        # --- Stations ---
        stations_data = [
            ("Karsiyaka Hub", 38.4637, 27.1100, "Karsiyaka Meydani, Izmir", "Izmir"),
            ("Bornova Station", 38.4700, 27.2200, "Bornova Merkez, Izmir", "Izmir"),
            ("Buca Point", 38.3900, 27.1700, "Buca Caddesi, Izmir", "Izmir"),
        ]
        stations = []
        for name, lat, lng, addr, city in stations_data:
            st = station_repo.create(ChargingStation(
                name=name, latitude=lat, longitude=lng, address=addr, city=city,
            ))
            stations.append(st)

        # --- Chargers (2 per station: 1 AC + 1 DC) ---
        for i, station in enumerate(stations):
            charger_repo.create(Charger(
                station_id=station.id,
                charger_code=f"AC 22kW #{i*2+1:02d}",
                charger_type="AC",
                power_output=22.0,
                connector_type="Type2",
                pricing_per_kwh=4.50,
            ))
            charger_repo.create(Charger(
                station_id=station.id,
                charger_code=f"DC 50kW #{i*2+2:02d}",
                charger_type="DC",
                power_output=50.0,
                connector_type="CCS",
                pricing_per_kwh=7.80,
            ))

        print("Seed completed:")
        print("  - 3 users (driver, operator, admin)")
        print("  - 3 wallets (500 TL each)")
        print("  - 2 vehicles (Tesla CCS, Nissan CHAdeMO)")
        print("  - 3 stations (Karsiyaka, Bornova, Buca)")
        print("  - 6 chargers (1 AC + 1 DC per station)")


if __name__ == "__main__":
    seed()
