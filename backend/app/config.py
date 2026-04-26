import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ev_user:ev_password@localhost:5432/ev_charging")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

ACCESS_TOKEN_EXPIRE_HOURS = 24
RESET_TOKEN_EXPIRE_MINUTES = 15
