from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime, timezone

class User(SQLModel, table=True):
    __tablename__ = "users"

    # -------------------
    # Core identity
    # -------------------
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, nullable=False)
    hashed_password: str

    full_name: Optional[str] = None
    phone_number: Optional[str] = None

    # -------------------
    # Wallet System
    # -------------------
    wallet_ballance: float = Field(default=0.0)

    # -------------------
    # Metadata
    # -------------------
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.now(timezone.utc))
    
    # -------------------
    # Relationships
    # -------------------
    vehicles: List["Vehicle"] = Relationship(back_populates="owner")
    reservations: List["Reservation"] = Relationship(back_populates="user")
    transactions: List["Transaction"] = Relationship(back_populates="user")
    favorites: List["FavoriteStation"] = Relationship(back_populates="user")