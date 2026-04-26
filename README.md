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
- **Backend:** FastAPI (Python) - Layer 2 (Routers) + Layer 3 (Services) + Layer 4 (Database)
- **Frontend:** Next.js 14 (TypeScript) - Layer 1 (Presentation)
- **Database:** PostgreSQL 16 with SQLModel ORM
- **Maps:** Google Maps API
- **Containerization:** Docker + Docker Compose

## Proje Yapisi
```
ev-charging-station/
├── backend/                   # FastAPI server (Layer 2-4)
│   ├── app/
│   │   ├── models/            # SQLModel entities (13 dosya, 16 domain sinifi)
│   │   ├── routers/           # API endpoints (Layer 2)
│   │   ├── services/          # Business logic (Layer 3) - Faz 2+
│   │   ├── core/              # security.py, dependencies.py
│   │   ├── main.py            # FastAPI app
│   │   ├── config.py          # Environment variables
│   │   ├── database.py        # SQLModel engine
│   │   └── seed.py            # Ornek veri yukleme
│   ├── alembic/               # Database migration dosyalari
│   ├── Dockerfile             # Backend container tanimi
│   ├── entrypoint.sh          # Baslangic scripti (migration + seed + start)
│   ├── requirements.txt       # Python bagimliliklari
│   └── .env.example           # Ornek environment dosyasi
├── frontend/                  # Next.js client (Layer 1)
│   ├── src/
│   │   ├── app/               # Sayfalar (App Router)
│   │   ├── components/        # React componentleri
│   │   ├── lib/               # API client, auth, types
│   │   └── hooks/             # Custom hooks - Faz 2+
│   ├── Dockerfile             # Frontend container tanimi
│   └── package.json
├── docs/
│   ├── diagrams/              # PlantUML & DrawIO diagramlar
│   └── planning/              # Faz planlari (faz1-4)
├── docker-compose.yml         # Tum sistemi ayaga kaldirir
└── README.md                  # Bu dosya
```

---

## 1. Oncelikler (Herkesin Bilgisayarina Kurmasi Gerekenler)

### 1.1 Docker Desktop Kurulumu

Docker, veritabanini ve servisleri bilgisayarina kurmadan calistirmani saglar.

**Mac:**
1. https://www.docker.com/products/docker-desktop/ adresine git
2. "Download for Mac" butonuna tikla (Apple Chip / Intel secenegini dogru sec)
3. `.dmg` dosyasini ac, Docker'i Applications klasorune surekle
4. Docker Desktop'i ac (ilk acilista biraz bekleyecek)
5. Menu bar'da balina ikonu gorunuyorsa hazir

**Windows:**
1. https://www.docker.com/products/docker-desktop/ adresine git
2. "Download for Windows" butonuna tikla
3. Installer'i calistir, WSL 2 backend secenegini isaretle
4. Bilgisayari yeniden baslat
5. Docker Desktop'i ac, sol altta "Engine running" yaziyorsa hazir

**Kontrol:**
```bash
docker --version
# Docker version 29.x.x gibi bir cikti gormelisin
```

### 1.2 Git Kurulumu

**Mac:** Terminal ac ve `git --version` yaz. Kurulu degilse otomatik kurar.

**Windows:** https://git-scm.com/download/win adresinden indir ve kur.

**Kontrol:**
```bash
git --version
# git version 2.x.x gibi bir cikti gormelisin
```

---

## 2. Projeyi Ilk Kez Calistirma (Adim Adim)

### Adim 1: Repo'yu klonla
```bash
git clone https://github.com/yigitcakar26/ev-charging-station.git
cd ev-charging-station
```

### Adim 2: Docker Desktop'in acik oldugunu kontrol et
Mac'te menu bar'da balina ikonu, Windows'ta system tray'de Docker ikonu gorunmeli.

### Adim 3: Tum sistemi baslat
```bash
docker-compose up --build
```

Ilk seferde ~2-3 dakika surer (image'lari indirir). Asagidaki ciktiyi gormelisin:

```
ev_charging_db         | database system is ready to accept connections
ev_charging_backend    | PostgreSQL is ready.
ev_charging_backend    | Running Alembic migrations...
ev_charging_backend    | Running upgrade  -> 001, Initial tables...
ev_charging_backend    | Seeding database...
ev_charging_backend    | Seed completed:
ev_charging_backend    |   - 3 users (driver, operator, admin)
ev_charging_backend    |   - 3 wallets (500 TL each)
ev_charging_backend    |   - 2 vehicles (Tesla CCS, Nissan CHAdeMO)
ev_charging_backend    |   - 3 stations (Karsiyaka, Bornova, Buca)
ev_charging_backend    |   - 6 chargers (1 AC + 1 DC per station)
ev_charging_backend    | Uvicorn running on http://0.0.0.0:8000
ev_charging_frontend   | Ready in 1521ms
```

### Adim 4: Calistigini dogrula

Tarayicida asagidaki adresleri ac:

| Adres | Ne gormeli |
|-------|------------|
| http://localhost:3000 | Frontend ana sayfa (harita) |
| http://localhost:8000 | `{"message": "EV Charging Station API", "docs": "/docs"}` |
| http://localhost:8000/docs | Swagger UI (tum API endpoint'leri) |

### Adim 5: Durdurmak icin
Terminal'de `Ctrl+C` bas. Veya baska bir terminal'de:
```bash
docker-compose down
```

---

## 3. Gunluk Calisma Rutini

Her gun kodlamaya baslamadan once:

```bash
# 1. Son degisiklikleri al
cd ev-charging-station
git pull

# 2. Sistemi baslat
docker-compose up --build
#   --build: Dockerfile veya requirements.txt degistiyse yeniden build eder
#   Degismediyse hizlica baslar (cache kullanir)

# 3. Kodunu yaz
#   Backend dosyalarini degistirince → otomatik restart olur (uvicorn --reload)
#   Frontend dosyalarini degistirince → otomatik refresh olur (next dev)

# 4. Isini bitirince durdur
Ctrl+C
```

---

## 4. Backend Gelistirme (Orcun + Yigit)

### Yeni Router/Endpoint Ekleme Ornegi

Diyelim `station_router.py` ekleyeceksin:

**1. Dosyayi olustur:**
```
backend/app/routers/station_router.py
```

**2. Router'i yaz:**
```python
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models.station import ChargingStation

router = APIRouter()

@router.get("/", response_model=list[ChargingStation])
def list_stations(session: Session = Depends(get_session)):
    return session.exec(select(ChargingStation)).all()
```

**3. `main.py`'ye ekle:**
```python
from app.routers.station_router import router as station_router
app.include_router(station_router, prefix="/stations", tags=["Stations"])
```

**4. Kaydet → backend otomatik restart olur → http://localhost:8000/docs'tan test et**

### Backend Container Icinde Komut Calistirma

Bazen container icinde direkt komut calistirman gerekebilir:

```bash
# Alembic migration olustur (yeni model/kolon eklediysen)
docker-compose exec backend alembic revision --autogenerate -m "add station_rating column"

# Migration'i uygula
docker-compose exec backend alembic upgrade head

# Python shell ac (debug icin)
docker-compose exec backend python

# Seed data'yi tekrar yukle (DB'yi sifirladiysan)
docker-compose exec backend python -m app.seed
```

### Veritabani Sifirlama (Gerekirse)

```bash
# Tum container'lari ve veritabanini sil
docker-compose down -v

# Tekrar baslat (migration + seed otomatik calisir)
docker-compose up --build
```

---

## 5. Frontend Gelistirme (Melis + G. Ege)

### Yeni Sayfa Ekleme Ornegi

Next.js App Router kullaniyoruz. Yeni sayfa = yeni klasor + `page.tsx`.

**1. Sayfa dosyasini olustur:**
```
frontend/src/app/stations/[id]/page.tsx
```

**2. Sayfayi yaz:**
```tsx
"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ChargingStation } from "@/lib/types";

export default function StationDetail({ params }: { params: { id: string } }) {
  const [station, setStation] = useState<ChargingStation | null>(null);

  useEffect(() => {
    api.get(`/stations/${params.id}`).then(res => setStation(res.data));
  }, [params.id]);

  if (!station) return <div>Yukleniyor...</div>;
  return <h1>{station.name}</h1>;
}
```

**3. Kaydet → http://localhost:3000/stations/1 adresinde gorunur**

### Frontend'ten Backend'e API Cagrisi

`src/lib/api.ts` dosyasi Axios instance'i hazir. JWT token otomatik eklenir:

```tsx
import api from "@/lib/api";

// GET istegi
const res = await api.get("/stations");

// POST istegi
const res = await api.post("/auth/login", { email: "...", password: "..." });

// JWT gerektiren istek (token otomatik eklenir)
const res = await api.get("/auth/me");
```

### Yeni npm Paketi Ekleme

```bash
# Container icinde calistir
docker-compose exec frontend npm install paket-adi

# VEYA package.json'a ekle, sonra rebuild et
docker-compose up --build
```

---

## 6. Veritabani Yonetimi

### pgAdmin ile Baglanti (Gorsel Arayuz)

pgAdmin zaten bilgisayarinda kuruluysa veritabanini gorsel olarak inceleyebilirsin:

| Ayar | Deger |
|------|-------|
| Host | `localhost` |
| Port | `5433` |
| Database | `ev_charging` |
| Username | `ev_user` |
| Password | `ev_password` |

### Tablolar

13 tablo mevcut (16 domain sinifi, EER generalization ile):

| Tablo | Aciklama |
|-------|----------|
| `user` | EVDriver + StationOperator + SystemAdministrator (tek tablo) |
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
| `report` | Admin raporlari |

---

## 7. Git Workflow

### Branch Stratejisi
```
main                              ← kararlı, calisan kod (direkt push YAPMA)
  └── feature/gorev-X-aciklama    ← her gorev icin ayri branch
```

### Yeni Ozellik Ekleme (Adim Adim)

```bash
# 1. main branch'e gec ve guncelle
git checkout main
git pull

# 2. Yeni branch olustur
git checkout -b feature/gorev-2.1-station-router

# 3. Kodunu yaz ve test et
#    (docker-compose up ile calisan sistem uzerinde test edersin)

# 4. Degisikliklerini commit et
git add backend/app/routers/station_router.py backend/app/main.py
git commit -m "Gorev 2.1: Station CRUD router with list/detail endpoints"

# 5. Branch'i GitHub'a pushla
git push -u origin feature/gorev-2.1-station-router

# 6. GitHub'da Pull Request (PR) ac
#    github.com/yigitcakar26/ev-charging-station adresinde
#    "Compare & pull request" butonuna tikla

# 7. Takim arkadaslarin review etsin → Approve → Merge
```

### Onemli Kurallar
- `main` branch'e direkt commit YAPMA, her zaman feature branch ac
- Commit mesajlarini anlamli yaz: `"Gorev 2.1: Station list endpoint"` (ne yaptigini yaz)
- Migration dosyalarini mutlaka commit et (baskalarinin DB'si seninkiyle sync kalsin)
- `.env` dosyasini ASLA commit etme (zaten `.gitignore`'da)

---

## 8. Sorun Giderme

### "Port already in use" hatasi
```bash
# Baska bir PostgreSQL calisiyorsa port cakisir
# .env dosyasinda portu degistir:
echo "DB_PORT=5434" > .env
docker-compose up --build
```

### "Cannot connect to Docker daemon" hatasi
Docker Desktop'i ac ve beklediginden emin ol. Menu bar'da/system tray'de balina ikonu gorunmeli.

### Backend baslamiyor / migration hatasi
```bash
# Veritabanini sifirla
docker-compose down -v
docker-compose up --build
```

### Frontend paket hatasi
```bash
# node_modules'u sifirla
docker-compose down
docker-compose build --no-cache frontend
docker-compose up
```

### Tum container'lari ve image'lari sifirla (son care)
```bash
docker-compose down -v --rmi all
docker-compose up --build
```

---

## 9. Test Kullanicilari (Seed Data)

Sistem her basladiginda otomatik yuklenir:

| Email | Sifre | Rol | Aciklama |
|-------|-------|-----|----------|
| driver@test.com | Driver123 | driver | EV surucu (rezervasyon, sarj, odeme) |
| operator@test.com | Operator123 | operator | Istasyon operatoru (bakim, ariza) |
| admin@test.com | Admin123 | admin | Sistem yoneticisi (raporlar, atamalar) |

**Araclar:** Tesla Model 3 (CCS), Nissan Leaf (CHAdeMO) - driver'a ait
**Istasyonlar:** Karsiyaka Hub, Bornova Station, Buca Point
**Cuzdanlar:** Her kullanicida 500 TL bakiye

---

## 10. API Dokumantasyonu

Backend calisirken http://localhost:8000/docs adresinde Swagger UI acilir.
Buradan tum endpoint'leri gorebilir ve direkt test edebilirsin.

### Mevcut Endpoint'ler (Faz 1)
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| POST | /auth/register | Yeni kullanici kayit |
| POST | /auth/login | Giris yap (JWT token al) |
| GET | /auth/me | Mevcut kullanici bilgisi |
| POST | /auth/password-reset-request | Sifre sifirlama istegi |
| POST | /auth/password-reset | Yeni sifre belirle |

---

## 11. Gereksinimler Ozeti
- 90 gereksinim, 9 viewpoint (Sommerville Ch.4)
- 3 Use Case: Reservation (UC1), Charging (UC2), Maintenance (UC3)
- 16 domain sinifi, 13 DB tablosu (EER generalization)
