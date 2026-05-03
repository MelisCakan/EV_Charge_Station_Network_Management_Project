from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

# -------------------------
# ENUMS (daha temiz ve güvenli)
# -------------------------

class TransactionType(str, Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"
    REFUND = "REFUND"

# -------------------------
# REQUEST MODELS
# -------------------------

class WalletTopUpRequest(BaseModel):
    amount: float = Field(
        ...,
        gt=0,
        le=10000,
        description="Top-up amount must be between 0 and 10000"
    )

# -------------------------
# RESPONSE MODELS
# -------------------------

class WalletResponse(BaseModel):
    user_id: int
    balance: float

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    type: TransactionType
    created_at: datetime

class ReceiptResponse(BaseModel):
    session_id: int
    total_kwh: float
    total_cost: float
    created_at: datetime