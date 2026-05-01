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
- **Database:** PostgreSQL with SQLModel ORM
- **Maps:** Google Maps API

## Proje Yapisi
```
ev-charging-station/
├── backend/                   # FastAPI server (Layer 2-4)
│   ├── app/
│   │   ├── models/            # SQLModel entities (13 dosya, 16 domain sinifi)
│   │   ├── repositories/      # Repository Pattern (BaseRepository + 14 model repo)
│   │   ├── routers/           # API endpoints (Layer 2)
│   │   ├── services/          # Business logic (Layer 3) - Faz 2+
│   │   ├── core/              # security.py, dependencies.py
│   │   ├── main.py            # FastAPI app
│   │   ├── config.py          # Environment variables
│   │   ├── database.py        # SQLModel engine
│   │   └── seed.py            # Ornek veri yukleme
│   ├── alembic/               # Database migration dosyalari
│   ├── requirements.txt       # Python bagimliliklari
│   └── .env.example           # Ornek environment dosyasi
├── frontend/                  # Next.js client (Layer 1)
│   ├── src/
│   │   ├── app/               # Sayfalar (App Router)
│   │   ├── components/        # React componentleri
│   │   ├── lib/               # API client, auth, types
│   │   └── hooks/             # Custom hooks - Faz 2+
│   └── package.json
├── docs/
│   ├── diagrams/              # PlantUML & DrawIO diagramlar
│   └── planning/              # Faz planlari (faz1-4)
└── README.md                  # Bu dosya
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
2. Sol panelde Servers > PostgreSQL'e sag tikla > Login Role/User olustur (opsiyonel, `postgres` kullanabilirsin)
3. Databases'e sag tikla > Create > Database
   - Name: `ev_charging`
   - Save

### 1.3 Python Kurulumu

Python 3.10+ gerekli: https://www.python.org/downloads/

```bash
python --version
# Python 3.10+ gormelisin
```

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

### Adim 2: Backend kurulumu
```bash
cd backend

# Virtual environment olustur
python -m venv venv

# Aktif et
# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Bagimliliklari yukle
pip install -r requirements.txt

# .env dosyasini olustur
cp .env.example .env
```

### Adim 3: .env dosyasini duzenle
`backend/.env` dosyasini ac ve PostgreSQL bilgilerini gir:
```
DATABASE_URL=postgresql://postgres:SENIN_SIFREN@localhost:5432/ev_charging
SECRET_KEY=your-secret-key-change-in-production
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```
> `SENIN_SIFREN` yerine PostgreSQL kurulumunda belirledigin sifreyi yaz.

### Adim 4: Migration ve Seed calistir
```bash
# Tablolari olustur
alembic upgrade head

# Ornek verileri yukle
python -m app.seed
```

### Adim 5: Backend'i baslat
```bash
uvicorn app.main:app --reload --port 8000
```
Tarayicida ac: http://localhost:8000 → `{"message": "EV Charging Station API"}`
API dokumantasyonu: http://localhost:8000/docs

### Adim 6: Frontend kurulumu (yeni terminal ac)
```bash
cd frontend

# Bagimliliklari yukle
npm install

# Frontend'i baslat
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

# 4. Kodunu yaz
#   Backend dosyalarini degistirince → otomatik restart olur (--reload)
#   Frontend dosyalarini degistirince → otomatik refresh olur (next dev)
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
from sqlmodel import Session
from app.database import get_session
from app.repositories.station_repository import StationRepository

router = APIRouter()

@router.get("/")
def list_stations(session: Session = Depends(get_session)):
    repo = StationRepository(session)
    return repo.get_active()
```

**3. `main.py`'ye ekle:**
```python
from app.routers.station_router import router as station_router
app.include_router(station_router, prefix="/stations", tags=["Stations"])
```

**4. Kaydet → backend otomatik restart olur → http://localhost:8000/docs'tan test et**

### Alembic Migration (Yeni Model/Kolon Eklediysen)

```bash
cd backend
source venv/bin/activate

# Yeni migration olustur
alembic revision --autogenerate -m "add station_rating column"

# Migration'i uygula
alembic upgrade head

# Seed data'yi tekrar yukle (DB'yi sifirladiysan)
python -m app.seed
```

### Veritabani Sifirlama (Gerekirse)

```bash
# pgAdmin'den ev_charging DB'sini sil ve yeniden olustur, sonra:
alembic upgrade head
python -m app.seed
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

export default function StationDetail({ params }: { params: { id: string } }) {
  const [station, setStation] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/stations/${params.id}`)
      .then(res => res.json())
      .then(data => setStation(data));
  }, [params.id]);

  if (!station) return <div>Yukleniyor...</div>;
  return <h1>{station.name}</h1>;
}
```

**3. Kaydet → http://localhost:3000/stations/1 adresinde gorunur**

### Yeni npm Paketi Ekleme

```bash
cd frontend
npm install paket-adi
```

---

## 6. Veritabani Yonetimi

### pgAdmin ile Baglanti

| Ayar | Deger |
|------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `ev_charging` |
| Username | `postgres` |
| Password | (kurulumda belirledigin sifre) |

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
main                              ← kararli, calisan kod (direkt push YAPMA)
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

# 4. Degisikliklerini commit et
git add backend/app/routers/station_router.py backend/app/main.py
git commit -m "Gorev 2.1: Station CRUD router with list/detail endpoints"

# 5. Branch'i GitHub'a pushla
git push -u origin feature/gorev-2.1-station-router

# 6. GitHub'da Pull Request (PR) ac
#    "Compare & pull request" butonuna tikla

# 7. Takim arkadaslarin review etsin → Approve → Merge
```

### Onemli Kurallar
- `main` branch'e direkt commit YAPMA, her zaman feature branch ac
- Commit mesajlarini anlamli yaz: `"Gorev 2.1: Station list endpoint"`
- Migration dosyalarini mutlaka commit et (baskalarinin DB'si seninkiyle sync kalsin)
- `.env` dosyasini ASLA commit etme (zaten `.gitignore`'da)

---

## 8. Sorun Giderme

### "Connection refused" / DB baglanti hatasi
- pgAdmin'den ev_charging DB'sinin var oldugundan emin ol
- `.env` dosyasindaki `DATABASE_URL`'i kontrol et (sifre dogru mu?)
- PostgreSQL servisinin calistigindan emin ol

### Migration hatasi
```bash
# Tablolari sifirla: pgAdmin'den ev_charging DB'sini drop et, yeniden olustur
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

---

## 9. Test Kullanicilari (Seed Data)

`python -m app.seed` ile yuklenir:

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

---

## 11. Gereksinimler Ozeti
- 90 gereksinim, 9 viewpoint (Sommerville Ch.4)
- 3 Use Case: Reservation (UC1), Charging (UC2), Maintenance (UC3)
- 16 domain sinifi, 13 DB tablosu (EER generalization)
# EV_Charge_Station_Network_Management_Project
