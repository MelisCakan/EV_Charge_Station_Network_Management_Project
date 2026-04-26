from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.core.security import decode_access_token
from app.core.database import get_session
from app.models.user import User

# -------------------
# TOKEN SCHEME
# -------------------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# -------------------
# DB SESSION
# -------------------

def get_db():
    with get_session() as session:
        yield session

# -------------------
# CURRENT USER
# -------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_db)
):
    """
    Decode JWT and return user
    """

    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user info"
        )
    
    user = session.exec(
        select(User).where(User.id == int(user_id))
    ).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user