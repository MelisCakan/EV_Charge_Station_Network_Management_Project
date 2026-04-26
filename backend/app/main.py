from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth_router import router as auth_router

app = FastAPI(
    title="EV Charging Station API",
    version="1.0.0"
)

# -------------------
# CORS CONFIG
# -------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # production'da frontend URL yazılır
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------
# ROUTERS
# -------------------

app.include_router(auth_router)