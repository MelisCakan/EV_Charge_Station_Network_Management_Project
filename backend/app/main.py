from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables

app = FastAPI(
    title="EV Charging Station Network Management API",
    description="Group 14 - FSE Project",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router'lar Faz 2-3'te eklenecek:
# app.include_router(auth_router, prefix="/auth", tags=["Auth"])


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/")
def root():
    return {"message": "EV Charging Station API", "docs": "/docs"}
