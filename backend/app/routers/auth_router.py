from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.security import(
    hash_password,
    verify_password,
    create_access_token
)

from app.core.dependencies import get_db, get_current_user

from app.models.user import User

from datetime import timedelta
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth", tags=["Auth"])

# -------------------
# REGISTER
# -------------------

@router.post("/register")
def register(user_data: dict, session: Session = Depends(get_db)):
    """
    Create new user
    """

    existing_user = session.exec(
        select(User).where(User.email == user_data["email"])
        ).first()

    if existing_user: 
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    new_user = User(
        email=user_data["email"], 
        hashed_password=hash_password(user_data["password"])
        )

    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return {"message": "User created successfully"}

# -------------------
# LOGIN
# -------------------
@router.post("/login")
def login(user_data: dict, session: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token
    """

    user = session.exec(
        select(User).where(User.email == user_data["email"])
        ).first()
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail = "Invalid credentials"
        )
    
    if not verify_password(user_data["password"], user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=token_expires
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }

# -------------------
# ME (PROTECTED ROUTE)
# -------------------
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Return current logged-in user
    """

    return {
        "id": current_user.id,
        "email": current_user.email,
        "wallet_balance": current_user.wallet_ballance,
        "is_admin": current_user.is_admin
    }