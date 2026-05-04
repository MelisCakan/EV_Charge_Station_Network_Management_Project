from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel
from pydantic import Field


# -------------------------
# REQUEST MODELS
# -------------------------

class WalletTopUpRequest(SQLModel):
    amount: float = Field(
        ...,
        gt=0,
        le=10000,
        description="Top-up amount must be between 0 and 10000"
    )


# -------------------------
# RESPONSE MODELS
# -------------------------

class WalletResponse(SQLModel):
    id: int
    user_id: int
    balance: float
    created_at: datetime


class TransactionResponse(SQLModel):
    id: int
    wallet_id: int
    session_id: Optional[int] = None
    amount: float
    type: str        # topup | charge | refund
    timestamp: datetime
    status: str
