import os
from dotenv import load_dotenv

load_dotenv()

# -------------------
# SECURITY CONFIG
# -------------------
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:PASSWORD@localhost:5432/fse_project")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 saat

ACCESS_TOKEN_EXPIRE_HOURS = 24
RESET_TOKEN_EXPIRE_MINUTES = 15


