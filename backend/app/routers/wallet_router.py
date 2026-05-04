from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.wallet_schema import (
    WalletTopUpRequest,
    WalletResponse,
    TransactionResponse,
)
from app.services.wallet_service import WalletService
from app.repositories.wallet_repository import WalletRepository, TransactionRepository

router = APIRouter(prefix="/wallet", tags=["Wallet"])


# -------------------------
# SERVICE DEPENDENCY
# -------------------------
def get_wallet_service(db: Session = Depends(get_session)):
    wallet_repo = WalletRepository(db)
    transaction_repo = TransactionRepository(db)
    return WalletService(wallet_repo, transaction_repo)


# -------------------------
# GET BALANCE
# -------------------------
@router.get("/balance", response_model=WalletResponse)
def get_balance(
    current_user: User = Depends(get_current_user),
    service: WalletService = Depends(get_wallet_service),
):
    """REQ 4.1: Cuzdan bakiyesini goruntule."""
    return service.get_balance(current_user.id)


# -------------------------
# TOPUP ENDPOINT
# -------------------------
@router.post("/topup", response_model=WalletResponse)
def topup_wallet(
    req: WalletTopUpRequest,
    current_user: User = Depends(get_current_user),
    service: WalletService = Depends(get_wallet_service),
):
    """REQ 4.1: Cuzdana bakiye yukle."""
    return service.topup(
        user_id=current_user.id,
        amount=req.amount,
    )


# -------------------------
# TRANSACTION HISTORY
# -------------------------
@router.get("/transactions", response_model=list[TransactionResponse])
def get_transactions(
    current_user: User = Depends(get_current_user),
    service: WalletService = Depends(get_wallet_service),
):
    """Islem gecmisini listele."""
    return service.get_transactions(current_user.id)
