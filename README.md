# EV Charging Station Network Management System

Group 14 - Fundamentals of Software Engineering Project

## Takim
| Kisi | Gorev |
|------|-------|
| Yigit Cakar | Backend Core & DB Architecture |
| Orcun | Backend Services & Auth |
| Melis | Frontend & UI |
| G. Ege | Maps & Integration |

## Mimari
- **Pattern:** Client-Server + Layered Architecture (Sommerville Ch.6)
- **Backend:** FastAPI (Python 3.11) - Layer 2 (Routers) + Layer 3 (Services) + Layer 4 (Database)
- **Frontend:** Next.js 16 (TypeScript, React 19) - Layer 1 (Presentation)
- **Database:** PostgreSQL 17 with SQLModel ORM
- **Maps:** Google Maps API (@vis.gl/react-google-maps)

## Proje Yapisi
```
EV_Charge_Station_Network_Management_Project/
├── backend/
│   ├── app/
│   │   ├── models/            # SQLModel entities (13 dosya, 16 domain sinifi)
│   │   ├── repositories/      # Repository Pattern (BaseRepository + 14 model repo)
│   │   ├── routers/           # API endpoints (Layer 2)
│   │   ├── services/          # Business logic (Layer 3)
│   │   ├── schemas/           # Pydantic request/response schemalar
│   │   ├── core/              # security.py, dependencies.py, config.py
│   │   ├── main.py            # FastAPI app
│   │   ├── config.py          # Environment variables
│   │   ├── database.py        # SQLModel engine
│   │   └── seed.py            # Ornek veri yukleme
│   ├── alembic/               # Database migration dosyalari
│   ├── requirements.txt       # Python bagimliliklari
│   └── .env.example           # Ornek environment dosyasi
├── frontend/
│   ├── app/                   # Sayfalar (Next.js App Router)
│   │   ├── auth/              # Login & Register sayfalari
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Ana sayfa (harita)
│   ├── components/            # React componentleri (Navbar, Footer, ui/)
│   ├── lib/                   # API client, AuthContext, types
│   └── package.json
├── docs/
│   ├── diagrams/              # PlantUML & DrawIO diagramlar
│   └── planning/              # Faz planlari (faz1-4)
└── README.md
```

---

## 1. Oncelikler (Herkesin Bilgisayarina Kurmasi Gerekenler)

### 1.1 PostgreSQL Kurulumu

**Mac:**
1. https://www.postgresql.org/download/macosx/ adresinden indir ve kur
2. Kurulum sirasinda `postgres` kullanicisi icin bir sifre belirle (unutma!)
3. pgAdmin otomatik kurulur

**Windows:**
1. https://www.postgresql.org/download/windows/ adresinden indir ve kur
2. Kurulum sirasinda `postgres` kullanicisi icin bir sifre belirle
3. "Stack Builder" adimini atla, pgAdmin otomatik kurulur

### 1.2 Veritabani Olusturma (pgAdmin)

1. pgAdmin'i ac
2. Sol panelde Servers > PostgreSQL > Databases'e sag tikla > Create > Database
   - Name: `fse_project`
   - Save

### 1.3 Python Kurulumu

Python 3.11+ gerekli: https://www.python.org/downloads/

```bash
python3 --version
# Python 3.11+ gormelisin
```

> **Not:** Python 3.14 bu projeyle uyumlu degil (psycopg2 desteklemiyor). 3.11 veya 3.12 kullan.

### 1.4 Node.js Kurulumu

Node.js 18+ gerekli: https://nodejs.org/

```bash
node --version
# v18+ gormelisin
```

### 1.5 Git Kurulumu

**Mac:** Terminal ac ve `git --version` yaz. Kurulu degilse otomatik kurar.

**Windows:** https://git-scm.com/download/win adresinden indir ve kur.

---

## 2. Projeyi Ilk Kez Calistirma (Adim Adim)

### Adim 1: Repo'yu klonla
```bash
git clone https://github.com/MelisCakan/EV_Charge_Station_Network_Management_Project.git
cd EV_Charge_Station_Network_Management_Project
```

### Adim 2: Calisma branch'ine gec
```bash
git checkout feature/faz2-yigit
```

### Adim 3: Backend kurulumu
```bash
cd backend

# Virtual environment olustur
python3 -m venv venv

# Aktif et
# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Bagimliliklari yukle
pip install -r requirements.txt
```

### Adim 4: Backend .env dosyasini olustur
```bash
cp .env.example .env
```

`backend/.env` dosyasini ac ve PostgreSQL bilgilerini gir:
```
DATABASE_URL=postgresql://postgres:SENIN_SIFREN@localhost:5432/fse_project
SECRET_KEY=dev-secret-key-change-in-production
GOOGLE_MAPS_API_KEY=
```
> `SENIN_SIFREN` yerine PostgreSQL kurulumunda belirledigin sifreyi yaz.

### Adim 5: Migration ve Seed calistir
```bash
# Tablolari olustur
alembic upgrade head

# Ornek verileri yukle
python -m app.seed
```

### Adim 6: Backend'i baslat
```bash
uvicorn app.main:app --reload --port 8000
```
- API root: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### Adim 7: Frontend kurulumu (yeni terminal ac)
```bash
cd frontend

# Bagimliliklari yukle
npm install
```

### Adim 8: Frontend .env.local dosyasini olustur
`frontend/.env.local` dosyasini olustur:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

### Adim 9: Frontend'i baslat
```bash
npm run dev
```
Tarayicida ac: http://localhost:3000

---

## 3. Gunluk Calisma Rutini

Her gun kodlamaya baslamadan once:

```bash
# 1. Son degisiklikleri al
git pull

# 2. Backend'i baslat (bir terminal)
cd backend
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt   # yeni paket eklendiyse
alembic upgrade head              # yeni migration varsa
uvicorn app.main:app --reload --port 8000

# 3. Frontend'i baslat (baska bir terminal)
cd frontend
npm install   # yeni paket eklendiyse
npm run dev
```

---

## 4. API Endpointleri (Mevcut)

### Auth (`/auth`)
| Method | Endpoint | Aciklama | Auth |
|--------|----------|----------|------|
| POST | `/auth/register` | Yeni kullanici kaydi + wallet olusturma | - |
| POST | `/auth/login` | JWT token al (24 saat gecerli) | - |
| GET | `/auth/me` | Giris yapan kullanici bilgisi | Bearer Token |
| POST | `/auth/password-reset-request` | Sifre sifirlama token'i al (15dk) | - |
| POST | `/auth/password-reset` | Yeni sifre belirle | - |

### Vehicles (`/vehicles`)
| Method | Endpoint | Aciklama | Auth |
|--------|----------|----------|------|
| GET | `/vehicles` | Kullanicinin araclari | Bearer Token |
| POST | `/vehicles` | Yeni arac kaydi | Bearer Token |
| GET | `/vehicles/{id}` | Arac detayi | Bearer Token |
| PUT | `/vehicles/{id}` | Arac guncelle | Bearer Token |
| DELETE | `/vehicles/{id}` | Arac sil | Bearer Token |
| GET | `/vehicles/{id}/compatibility/{charger_id}` | Uyumluluk kontrolu (REQ 7.2) | Bearer Token |

### Stations (`/stations`)
| Method | Endpoint | Aciklama | Auth |
|--------|----------|----------|------|
| GET | `/stations` | Tum istasyonlar (?city=X, ?status=active) | - |
| GET | `/stations/{id}` | Istasyon detayi | - |
| GET | `/stations/{id}/chargers` | Istasyonun charger'lari (?connector_type=CCS, ?status=available) | - |

---

## 5. Backend Gelistirme

### Yeni Router Ekleme Adimi

1. Schema olustur: `app/schemas/yeni_schema.py`
2. Router olustur: `app/routers/yeni_router.py`
3. `app/main.py`'ye ekle:
```python
from app.routers.yeni_router import router as yeni_router
app.include_router(yeni_router)
```
4. Kaydet → backend otomatik restart olur (`--reload`)
5. http://localhost:8000/docs'tan test et

### Alembic Migration (Yeni Model/Kolon Eklediysen)

```bash
cd backend
source venv/bin/activate

# Yeni migration olustur
alembic revision --autogenerate -m "aciklama"

# Migration'i uygula
alembic upgrade head
```

### Veritabani Sifirlama (Gerekirse)

```bash
# pgAdmin'den fse_project DB'sini sil ve yeniden olustur, sonra:
alembic upgrade head
python -m app.seed
```

---

## 6. Frontend Gelistirme

### Yeni Sayfa Ekleme

Next.js App Router kullaniyoruz. Yeni sayfa = yeni klasor + `page.tsx`.

```
frontend/app/vehicles/page.tsx        → /vehicles
frontend/app/stations/[id]/page.tsx   → /stations/1, /stations/2, ...
```

### API Cagrisi Ornegi

```tsx
import { api } from '@/lib/api';

// GET (auth gerektiren)
const response = await api.get('/vehicles');

// POST
const response = await api.post('/vehicles', { brand: "Tesla", ... });
```

> `lib/api.ts` icindeki axios instance otomatik olarak Bearer token ekler.

### Yeni npm Paketi Ekleme

```bash
cd frontend
npm install paket-adi
```

---

## 7. Veritabani

### pgAdmin Baglanti Bilgileri

| Ayar | Deger |
|------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `fse_project` |
| Username | `postgres` |
| Password | (kurulumda belirledigin sifre) |

### Tablolar

13 tablo mevcut (16 domain sinifi, EER generalization ile):

| Tablo | Aciklama |
|-------|----------|
| `user` | EVDriver + StationOperator + SystemAdministrator (tek tablo, role field) |
| `vehicle` | Kullanici araclari |
| `charging_stations` | Sarj istasyonlari |
| `charger` | Istasyondaki sarj cihazlari |
| `reservation` | Rezervasyonlar |
| `charging_sessions` | Sarj oturumlari |
| `wallet` | Kullanici cuzdanlari |
| `transaction` | Odeme islemleri |
| `digital_receipts` | Dijital makbuzlar |
| `notification` | Bildirimler |
| `issue_reports` | Ariza raporlari |
| `maintenance_notes` | Bakim notlari |
| `favorite_stations` | Favori istasyonlar |

---

## 8. Git Workflow

### Branch Stratejisi
```
main                              ← kararli, calisan kod (direkt push YAPMA)
  └── feature/faz2-yigit          ← aktif gelistirme branch'i
```

### Degisiklikleri Push Etme

```bash
# 1. Degisikliklerini commit et
git add backend/app/routers/yeni_router.py backend/app/main.py
git commit -m "Gorev X.Y: Aciklama"

# 2. Push
git push
```

### Onemli Kurallar
- `main` branch'e direkt commit YAPMA
- Commit mesajlarini anlamli yaz: `"Gorev 2.4: Reservation service with 3 business rules"`
- Migration dosyalarini mutlaka commit et
- `.env` dosyasini ASLA commit etme (zaten `.gitignore`'da)

---

## 9. Test Kullanicilari (Seed Data)

`python -m app.seed` ile yuklenir:

| Email | Sifre | Rol | Aciklama |
|-------|-------|-----|----------|
| driver@test.com | Driver123 | driver | EV surucu (rezervasyon, sarj, odeme) |
| operator@test.com | Operator123 | operator | Istasyon operatoru (bakim, ariza) |
| admin@test.com | Admin123 | admin | Sistem yoneticisi (raporlar, atamalar) |

**Araclar:** Tesla Model 3 (CCS), Nissan Leaf (CHAdeMO) - driver'a ait
**Istasyonlar:** Karsiyaka Hub, Bornova Station, Buca Point (her biri 1 AC + 1 DC charger)
**Cuzdanlar:** Her kullanicida 500 TL bakiye

---

## 10. Sorun Giderme

### "Connection refused" / DB baglanti hatasi
- pgAdmin'den `fse_project` DB'sinin var oldugundan emin ol
- `.env` dosyasindaki `DATABASE_URL`'i kontrol et (sifre dogru mu?)
- PostgreSQL servisinin calistigindan emin ol

### Migration hatasi
```bash
# Tablolari sifirla: pgAdmin'den fse_project DB'sini drop et, yeniden olustur
alembic upgrade head
python -m app.seed
```

### "ModuleNotFoundError" hatasi
```bash
# Virtual environment aktif mi kontrol et
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend paket hatasi
```bash
cd frontend
rm -rf node_modules
npm install
```

### Python 3.14 uyumsuzluk
`psycopg2-binary` Python 3.14 ile calismaz. Python 3.11 veya 3.12 kullan.

---

## 11. Gereksinimler Ozeti
- 90 gereksinim, 9 viewpoint (Sommerville Ch.4)
- 3 Use Case: Reservation (UC1), Charging (UC2), Maintenance (UC3)
- 16 domain sinifi, 13 DB tablosu (EER generalization)
- Repository Pattern + Layered Architecture
