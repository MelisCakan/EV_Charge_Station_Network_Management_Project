# Faz 1: Mimari Tasarim ve Proje Altyapisi
**Tarih:** 14-20 Nisan 2026
**Hedef:** Client-Server altyapisini kurmak: Server (FastAPI + PostgreSQL - Layer 2-4) ve Client (Next.js - Layer 1), DB semasini olusturmak, haritayi render etmek.

---

## Yigit - Backend Core & DB Mimari

### Gorev 1.1: Proje Iskeleti
- [ ] `backend/` klasor yapisi olustur
- [ ] `requirements.txt` hazirla:
  ```
  fastapi==0.109.0
  uvicorn[standard]==0.27.0
  sqlmodel==0.0.14
  psycopg2-binary==2.9.9
  alembic==1.13.1
  pyjwt==2.8.0
  bcrypt==4.1.2
  python-dotenv==1.0.0
  pytest==8.0.0
  httpx==0.26.0
  ```
- [ ] `app/config.py`: DATABASE_URL, SECRET_KEY, GOOGLE_MAPS_API_KEY (.env)
- [ ] `app/database.py`: SQLModel engine, `create_db_and_tables()`, `get_session()` dependency

### Gorev 1.2: Tum SQLModel Entity'ler (13 model dosyasi - 16 domain sinifi)
Domain modeldeki 16 sinif, generalization ile 13 dosyada implemente edilecek:

- [ ] `app/models/user.py`
  ```python
  class User(SQLModel, table=True):
      id: int | None = Field(default=None, primary_key=True)
      email: str = Field(unique=True, index=True)
      password_hash: str
      full_name: str
      phone_number: str | None = None
      role: str = Field(default="driver")  # driver | operator | admin
      assigned_region: str | None = None   # only for operators
      created_at: datetime = Field(default_factory=datetime.utcnow)
  ```
  > Generalization: EVDriver + StationOperator + SystemAdministrator → tek User tablosu

- [ ] `app/models/vehicle.py`
  ```python
  class Vehicle(SQLModel, table=True):
      id: int | None = Field(default=None, primary_key=True)
      user_id: int = Field(foreign_key="user.id", index=True)
      brand: str
      model: str
      battery_capacity: float  # kWh
      connector_type: str      # CCS | CHAdeMO | Type2
      plate_number: str = Field(unique=True)
      created_at: datetime = Field(default_factory=datetime.utcnow)
  ```

- [ ] `app/models/station.py`
  ```python
  class ChargingStation(SQLModel, table=True):
      __tablename__ = "charging_stations"
      id: int | None = Field(default=None, primary_key=True)
      name: str
      latitude: float
      longitude: float
      address: str
      city: str | None = None
      operating_hours: str  # REQ 2.13: Varsayilan "09:00-18:00", operator istasyon bazinda ozellestirebilir
      status: str = Field(default="active")  # active | inactive
      created_at: datetime = Field(default_factory=datetime.utcnow)
  ```

- [ ] `app/models/charger.py`
  ```python
  class Charger(SQLModel, table=True):
      id: int | None = Field(default=None, primary_key=True)
      station_id: int = Field(foreign_key="charging_stations.id", index=True)
      charger_code: str           # "DC 50kW #03"
      charger_type: str           # AC | DC
      power_output: float         # kW (22, 50, 150)
      connector_type: str         # CCS | CHAdeMO | Type2
      pricing_per_kwh: float      # TL - REQ 1.13: Operator manuel gunceller, devam eden oturumlar baslangic fiyatiyla kalir
      status: str = Field(default="available")  # available | occupied | offline
  ```

- [ ] `app/models/reservation.py`
  ```python
  class Reservation(SQLModel, table=True):
      id: int | None = Field(default=None, primary_key=True)
      user_id: int = Field(foreign_key="user.id", index=True)
      vehicle_id: int = Field(foreign_key="vehicle.id")
      charger_id: int = Field(foreign_key="charger.id", index=True)
      date: date_type
      start_time: time_type
      end_time: time_type
      status: str = Field(default="confirmed")  # confirmed | cancelled | completed
      created_at: datetime = Field(default_factory=datetime.utcnow)
  ```

- [ ] `app/models/charging_session.py`
  ```python
  class ChargingSession(SQLModel, table=True):
      __tablename__ = "charging_sessions"
      id: int | None = Field(default=None, primary_key=True)
      reservation_id: int = Field(foreign_key="reservation.id", unique=True)
      start_battery_level: float | None = None  # %
      end_battery_level: float | None = None    # %
      energy_consumed: float | None = None      # kWh
      total_cost: float | None = None           # TL
      status: str = Field(default="active")     # active | completed
      started_at: datetime = Field(default_factory=datetime.utcnow)
      completed_at: datetime | None = None
  ```

- [ ] `app/models/wallet.py`
  ```python
  class Wallet(SQLModel, table=True):
      id: int | None = Field(default=None, primary_key=True)
      user_id: int = Field(foreign_key="user.id", unique=True)
      balance: float = Field(default=0.0)
      created_at: datetime = Field(default_factory=datetime.utcnow)

  class Transaction(SQLModel, table=True):
      id: int | None = Field(default=None, primary_key=True)
      wallet_id: int = Field(foreign_key="wallet.id", index=True)
      session_id: int | None = Field(default=None, foreign_key="charging_sessions.id")
      amount: float
      type: str          # topup | charge | refund
      timestamp: datetime = Field(default_factory=datetime.utcnow)
      status: str = Field(default="completed")  # completed | pending | failed
  ```

- [ ] `app/models/issue_report.py`
  ```python
  class IssueReport(SQLModel, table=True):
      __tablename__ = "issue_reports"
      id: int | None = Field(default=None, primary_key=True)
      user_id: int = Field(foreign_key="user.id")
      charger_id: int = Field(foreign_key="charger.id", index=True)
      description: str
      category: str        # hardware | software | payment | other
      status: str = Field(default="open")  # open | in_progress | resolved
      reported_at: datetime = Field(default_factory=datetime.utcnow)
  ```

- [ ] `app/models/maintenance_note.py`
  ```python
  class MaintenanceNote(SQLModel, table=True):
      __tablename__ = "maintenance_notes"
      id: int | None = Field(default=None, primary_key=True)
      issue_report_id: int = Field(foreign_key="issue_reports.id", index=True)
      user_id: int = Field(foreign_key="user.id")  # operator
      content: str
      created_at: datetime = Field(default_factory=datetime.utcnow)
  ```

- [ ] `app/models/digital_receipt.py`
  ```python
  class DigitalReceipt(SQLModel, table=True):
      __tablename__ = "digital_receipts"
      id: int | None = Field(default=None, primary_key=True)
      session_id: int = Field(foreign_key="charging_sessions.id", unique=True)
      issued_at: datetime = Field(default_factory=datetime.utcnow)
      total_amount: float
      energy_consumed: float
      unit_price: float
  ```

- [ ] `app/models/notification.py`
  ```python
  class Notification(SQLModel, table=True):
      id: int | None = Field(default=None, primary_key=True)
      user_id: int = Field(foreign_key="user.id", index=True)
      message: str
      type: str            # reservation_confirm | charging_complete | low_balance | maintenance
      sent_at: datetime = Field(default_factory=datetime.utcnow)
      is_read: bool = Field(default=False)
  ```

- [ ] `app/models/favorite_station.py`
  ```python
  class FavoriteStation(SQLModel, table=True):
      __tablename__ = "favorite_stations"
      id: int | None = Field(default=None, primary_key=True)
      user_id: int = Field(foreign_key="user.id", index=True)
      station_id: int = Field(foreign_key="charging_stations.id")
      added_at: datetime = Field(default_factory=datetime.utcnow)
  ```

- [ ] `app/models/report.py`
  ```python
  class Report(SQLModel, table=True):
      id: int | None = Field(default=None, primary_key=True)
      admin_id: int = Field(foreign_key="user.id")
      type: str            # revenue | utilization | peak_hours
      date_range: str
      content: str         # JSON string
      created_at: datetime = Field(default_factory=datetime.utcnow)
  ```

### Gorev 1.3: Alembic + Seed Data
- [ ] `alembic init alembic`
- [ ] `alembic.ini` → DATABASE_URL bagla
- [ ] `alembic/env.py` → tum model'leri import et
- [ ] `alembic revision --autogenerate -m "initial tables"`
- [ ] `alembic upgrade head`
- [ ] `app/seed.py` → ornek veriler:
  - 3 user (1 driver, 1 operator, 1 admin)
  - 2 vehicle (Tesla Model 3 CCS, Nissan Leaf CHAdeMO)
  - 3 station (Karsiyaka Hub, Bornova Station, Buca Point)
  - 6 charger (her istasyonda 2: 1 AC + 1 DC)
  - Wallet'lar (her kullanicida 500 TL)

---

## Orcun - Backend Servis & Auth

### Gorev 1.4: Auth Sistemi (Layer 2 Core)
- [ ] `app/core/security.py`
  ```python
  # JWT token olusturma (PyJWT)
  def create_access_token(user_id: int, role: str) -> str
  # Token dogrulama
  def verify_token(token: str) -> dict
  # Sifre hashleme (bcrypt)
  def hash_password(password: str) -> str
  def verify_password(plain: str, hashed: str) -> bool
  ```

- [ ] `app/core/dependencies.py`
  ```python
  # FastAPI Depends
  async def get_current_user(token) -> User
  async def get_current_admin(user) -> User  # role check
  async def get_current_operator(user) -> User  # role check
  ```

### Gorev 1.5: Auth Router + Main App (REQ 1.16, 1.17)
- [ ] `app/routers/auth_router.py`
  - POST /auth/register → user + wallet olustur (REQ 1.16: email, full_name, phone, password min 8 char + 1 uppercase + 1 digit)
  - POST /auth/login → JWT token don (24 saat gecerli)
  - GET /auth/me → current user bilgileri
  - POST /auth/password-reset-request → email ile sifirlama linki gonder (REQ 1.17: 15 dk gecerli)
  - POST /auth/password-reset → yeni sifre belirle

- [ ] `app/main.py`
  ```python
  app = FastAPI(title="EV Charging Station API")  # SERVER side (Client-Server pattern)
  app.add_middleware(CORSMiddleware, ...)
  app.include_router(auth_router, prefix="/auth", tags=["Auth"])
  # diger router'lar Faz 2-3'te eklenecek
  ```

---

## Melis - Frontend & UI

### Gorev 1.6: Next.js Proje Kurulumu
> Client-Server pattern'de CLIENT tarafini olusturur. Browser'da calisir, Server'a HTTP/REST ile baglanir.

- [ ] `npx create-next-app@14 frontend --typescript --tailwind --app`
- [ ] shadcn/ui kurulumu: `npx shadcn-ui@latest init`
- [ ] `src/lib/api.ts` → Axios instance + JWT interceptor
- [ ] `src/lib/auth.ts` → token get/set/remove
- [ ] `src/lib/types.ts` → TypeScript interfaces (User, Vehicle, Station, Charger, Reservation, etc.)

### Gorev 1.7: Layout + Auth Sayfalari
- [ ] `src/app/layout.tsx` → Root layout: navbar, footer, AuthProvider
- [ ] `src/app/(auth)/login/page.tsx` → Form Fill-in (email + password)
- [ ] `src/app/(auth)/register/page.tsx` → Form Fill-in (email, password, full_name, phone)

---

## G. Ege - Maps & Entegrasyon

### Gorev 1.8: Google Maps Kurulumu
- [ ] Google Maps API key al
- [ ] `@react-google-maps/api` veya `@vis.gl/react-google-maps` kurulumu
- [ ] `src/components/map/MapView.tsx`
  - Google Maps render
  - Kullanici konumu (Geolocation API)
  - Pan, zoom (Direct Manipulation)
- [ ] Temel marker gosterimi (test amacli static data)

---

## Faz 1 Tamamlanma Kriterleri
- [ ] `docker-compose up` ile PostgreSQL ayaga kalkiyor
- [ ] `alembic upgrade head` ile tum tablolar olusturuluyor
- [ ] `python seed.py` ile ornek veriler yukleniyor
- [ ] POST /auth/register + POST /auth/login calisiyor (JWT donuyor)
- [ ] GET /auth/me JWT ile calisiyor
- [ ] Frontend login/register sayfasi backend'e baglanıyor (Client-Server: HTTP/REST iletisimi calisiyor)
- [ ] Harita render ediliyor ve kullanici konumu gorunuyor
