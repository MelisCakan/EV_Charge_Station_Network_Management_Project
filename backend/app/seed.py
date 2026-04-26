"""Seed script: ornek verilerle veritabanini doldurur."""

from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.station import ChargingStation
from app.models.charger import Charger
from app.models.wallet import Wallet
import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def seed():
    create_db_and_tables()

    with Session(engine) as session:
        # Check if already seeded
        if session.exec(select(User)).first():
            print("Database already seeded, skipping.")
            return

        # --- Users ---
        driver = User(
            email="driver@test.com",
            password_hash=hash_password("Driver123"),
            full_name="Ahmet Yilmaz",
            phone_number="05551234567",
            role="driver",
        )
        operator = User(
            email="operator@test.com",
            password_hash=hash_password("Operator123"),
            full_name="Elif Demir",
            phone_number="05559876543",
            role="operator",
            assigned_region="Izmir",
        )
        admin = User(
            email="admin@test.com",
            password_hash=hash_password("Admin123"),
            full_name="System Admin",
            role="admin",
        )
        session.add_all([driver, operator, admin])
        session.commit()
        session.refresh(driver)
        session.refresh(operator)
        session.refresh(admin)

        # --- Wallets (500 TL each) ---
        for user in [driver, operator, admin]:
            session.add(Wallet(user_id=user.id, balance=500.0))
        session.commit()

        # --- Vehicles ---
        session.add_all([
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
        session.commit()

        # --- Stations ---
        stations_data = [
            ("Karsiyaka Hub", 38.4637, 27.1100, "Karsiyaka Meydani, Izmir", "Izmir"),
            ("Bornova Station", 38.4700, 27.2200, "Bornova Merkez, Izmir", "Izmir"),
            ("Buca Point", 38.3900, 27.1700, "Buca Caddesi, Izmir", "Izmir"),
        ]
        stations = []
        for name, lat, lng, addr, city in stations_data:
            st = ChargingStation(name=name, latitude=lat, longitude=lng, address=addr, city=city)
            session.add(st)
            stations.append(st)
        session.commit()
        for st in stations:
            session.refresh(st)

        # --- Chargers (2 per station: 1 AC + 1 DC) ---
        for i, station in enumerate(stations):
            session.add(Charger(
                station_id=station.id,
                charger_code=f"AC 22kW #{i*2+1:02d}",
                charger_type="AC",
                power_output=22.0,
                connector_type="Type2",
                pricing_per_kwh=4.50,
            ))
            session.add(Charger(
                station_id=station.id,
                charger_code=f"DC 50kW #{i*2+2:02d}",
                charger_type="DC",
                power_output=50.0,
                connector_type="CCS",
                pricing_per_kwh=7.80,
            ))
        session.commit()

        print("Seed completed:")
        print("  - 3 users (driver, operator, admin)")
        print("  - 3 wallets (500 TL each)")
        print("  - 2 vehicles (Tesla CCS, Nissan CHAdeMO)")
        print("  - 3 stations (Karsiyaka, Bornova, Buca)")
        print("  - 6 chargers (1 AC + 1 DC per station)")


if __name__ == "__main__":
    seed()
