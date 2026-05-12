from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.wallet import Wallet, Transaction
from app.repositories.wallet_repository import WalletRepository, TransactionRepository
from app.services.notification_service import NotificationService

LOW_BALANCE_THRESHOLD = 50.0  # REQ 1.15 amendment


class WalletService:

    def __init__(self, wallet_repo: WalletRepository, transaction_repo: TransactionRepository):
        self.wallet_repo = wallet_repo
        self.transaction_repo = transaction_repo

    # -------------------------
    # GET BALANCE
    # -------------------------
    def get_balance(self, user_id: int) -> Wallet:
        wallet = self.wallet_repo.get_by_user_id(user_id)
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found",
            )
        return wallet

    # -------------------------
    # TOPUP (Req 4.1, 4.3, 4.6)
    # -------------------------
    def topup(self, user_id: int, amount: float) -> Wallet:
        """Wallet balance artirma (Req 4.1, 4.3, 4.6)"""
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be greater than 0",
            )

        wallet = self.get_balance(user_id)
        wallet.balance += amount
        self.wallet_repo.update(wallet)

        transaction = Transaction(
            wallet_id=wallet.id,
            amount=amount,
            type="topup",
            status="completed",
        )
        self.transaction_repo.create(transaction)

        return wallet

    # -------------------------
    # DEDUCT (UC2 Step 8, Req 4.4, 4.7)
    # -------------------------
    def deduct(self, user_id: int, amount: float, session_id: int | None = None) -> Wallet:
        """
        REQ 4.4: Sarj tamamlaninca otomatik odeme.
        REQ 4.7: Yetersiz bakiye kontrolu.
        REQ 1.15 amendment: Bakiye 50 TL altina dustugunde bildirim.
        """
        wallet = self.get_balance(user_id)

        if wallet.balance < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient wallet balance",
            )

        wallet.balance -= amount
        self.wallet_repo.update(wallet)

        transaction = Transaction(
            wallet_id=wallet.id,
            session_id=session_id,
            amount=-amount,
            type="charge",
            status="completed",
        )
        self.transaction_repo.create(transaction)

        # REQ 1.15 amendment: dusuk bakiye bildirimi
        if wallet.balance < LOW_BALANCE_THRESHOLD:
            NotificationService.send_low_balance(
                user_id=user_id,
                balance=wallet.balance,
                db=self.wallet_repo.session,
            )

        return wallet

    # -------------------------
    # REFUND (Req 4.6)
    # -------------------------
    def refund(self, user_id: int, amount: float) -> Wallet:
        """REQ 4.6: Iptal/hata durumunda iade."""
        wallet = self.get_balance(user_id)
        wallet.balance += amount
        self.wallet_repo.update(wallet)

        transaction = Transaction(
            wallet_id=wallet.id,
            amount=amount,
            type="refund",
            status="completed",
        )
        self.transaction_repo.create(transaction)

        return wallet

    # -------------------------
    # TRANSACTION HISTORY
    # -------------------------
    def get_transactions(self, user_id: int) -> list[Transaction]:
        """Islem gecmisi."""
        wallet = self.get_balance(user_id)
        return self.transaction_repo.get_by_wallet_id(wallet.id)
