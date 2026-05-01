from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    __table_args__ = (
        Index("ix_user_role", "role"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    full_name: str
    phone_number: Optional[str] = None
    role: str = Field(default="driver")  # driver | operator | admin
    assigned_region: Optional[str] = None  # only for operators
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
