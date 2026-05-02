from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_db_and_tables
from app.routers.auth_router import router as auth_router
from app.routers.vehicle_router import router as vehicle_router
from app.routers.station_router import router as station_router
from app.routers.reservation_router import router as reservation_router

app = FastAPI(
    title="EV Charging Station Network Management API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(vehicle_router)
app.include_router(station_router)
app.include_router(reservation_router)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/")
def root():
    return {"message": "EV Charging Station API", "docs": "/docs"}
