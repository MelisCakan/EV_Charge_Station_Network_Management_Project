from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.schemas.wallet_schema import WalletTopUpRequest, WalletResponse
from backend.app.services.wallet_service import WalletService
from backend.app.repositories.wallet_repository import WalletRepository, TransactionRepository
from backend.app.database import get_session
from app.core.dependencies import get_current_user
from app.models.user import User


router = APIRouter(prefix="/wallet", tags=["Wallet"])

# -------------------------
# SERVICE DEPENDENCY
# -------------------------
def get_wallet_service(db: Session = Depends(get_session)):
    wallet_repo = WalletRepository(db)
    transaction_repo = TransactionRepository(db)
    return WalletService(wallet_repo, transaction_repo)


# -------------------------
# TOPUP ENDPOINT
# -------------------------
@router.post("/topup", response_model=WalletResponse)
def topup_wallet(
    req: WalletTopUpRequest,
    user: User = Depends(get_current_user),
    service: WalletService = Depends(get_wallet_service)
):
    wallet = service.topup(
        user_id=user.id,
        amount=req.amount,
        payment_token="mock-token"  # gerçekte user modelden gelir (user veya wallet modela token eklenmeli)
    )

    return wallet


# -------------------------
# GET WALLET
# -------------------------
@router.get("/", response_model=WalletResponse)
def get_wallet(
    user_id: int,
    service: WalletService = Depends(get_wallet_service)
):
    wallet = service.wallet_repo.get_by_user_id(user_id)

    if not wallet:
        return {"user_id": user_id, "balance": 0.0}
    
    return wallet