from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import timedelta

from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_session
from app.models.user import User
from app.models.wallet import Wallet

router = APIRouter(prefix="/auth", tags=["Auth"])


# -------------------
# REGISTER (REQ 1.16)
# -------------------

@router.post("/register")
def register(user_data: dict, session: Session = Depends(get_session)):
    existing_user = session.exec(
        select(User).where(User.email == user_data["email"])
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    new_user = User(
        email=user_data["email"],
        password_hash=hash_password(user_data["password"]),
        full_name=user_data.get("full_name", ""),
        phone_number=user_data.get("phone_number"),
        role=user_data.get("role", "driver"),
    )

    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    # Wallet olustur (REQ 1.16: register ile birlikte wallet)
    wallet = Wallet(user_id=new_user.id, balance=0.0)
    session.add(wallet)
    session.commit()

    return {"message": "User created successfully", "user_id": new_user.id}


# -------------------
# LOGIN
# -------------------

@router.post("/login")
def login(user_data: dict, session: Session = Depends(get_session)):
    user = session.exec(
        select(User).where(User.email == user_data["email"])
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(user_data["password"], user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=token_expires,
    )

    return {"access_token": token, "token_type": "bearer"}


# -------------------
# ME (PROTECTED ROUTE)
# -------------------

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone_number": current_user.phone_number,
        "role": current_user.role,
    }
