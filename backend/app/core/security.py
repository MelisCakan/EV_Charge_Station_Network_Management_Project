from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from typing import Optional

# -------------------
# CONFIG
# -------------------

from core.config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# -------------------
# PASSWORD HASHING
# -------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated = "auto")

def hash_password(password: str) -> str:
    """
    Hash plain password using bcrypt
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify plain password with hashed password
    """
    return pwd_context.verify(plain_password, hashed_password)

# -------------------
# JWT TOKEN
# -------------------
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Create JWT token with expiration
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode JWT token and return payload
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None