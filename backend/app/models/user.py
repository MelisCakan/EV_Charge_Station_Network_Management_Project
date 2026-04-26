from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    """Generalization: EVDriver + StationOperator + SystemAdministrator -> tek User tablosu"""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    full_name: str
    phone_number: Optional[str] = None
    role: str = Field(default="driver", index=True)  # driver | operator | admin
    assigned_region: Optional[str] = None  # only for operators
    created_at: datetime = Field(default_factory=datetime.utcnow)
