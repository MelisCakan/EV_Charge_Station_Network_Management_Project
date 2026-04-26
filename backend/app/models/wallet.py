from datetime import datetime
from typing import Optional
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class Wallet(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    balance: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Transaction(SQLModel, table=True):
    __table_args__ = (
        Index("ix_transaction_wallet_timestamp", "wallet_id", "timestamp"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    wallet_id: int = Field(foreign_key="wallet.id", index=True)
    session_id: Optional[int] = Field(default=None, foreign_key="charging_sessions.id", index=True)
    amount: float
    type: str  # topup | charge | refund
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="completed")  # completed | pending | failed
