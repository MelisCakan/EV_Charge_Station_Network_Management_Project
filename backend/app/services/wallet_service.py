from backend.app.schemas.wallet_schema import TransactionType
from backend.app.repositories.wallet_repository import WalletRepository, TransactionRepository
from datetime import datetime

class WalletService:

    def __init__(self, wallet_repo: WalletRepository, transaction_repo: TransactionRepository):
        self.wallet_repo = wallet_repo
        self.transaction_repo = transaction_repo

    # -------------------------
    # TOPUP (Req 4.1, 4.3, 4.6)
    # -------------------------
    def topup(self, user_id: int, amount: float, payment_token: str):
        """
        Wallet balance artirma (Req 4.1, 4.3, 4.6)
        """

        # 1. Payment provider simülasyonu
        payment_success = self._process_payment(payment_token, amount)

        if not payment_success:
            raise Exception("Payment failed")
        
        # 2. Wallet getir
        wallet = self.wallet_repo.get_by_user_id(user_id)

        if wallet is None:
            raise Exception("Wallet not found")
        
        # 3. Balance update
        wallet.balance += amount
        self.wallet_repo.session.add(wallet)
        self.wallet_repo.session.commit()

        # 4. Transaction create (CREDIT)
        self.transaction_repo.session.add(
            self.transaction_repo.model(
                user_id=user_id,
                wallet_id=wallet.id,
                amount=amount,
                type=TransactionType.CREDIT,
                created_at=datetime.utcnow()
            )
        )
        self.transaction_repo.session.commit()

        return wallet
    

    # -------------------------
    # DEDUCT (UC2 Step 8)
    # -------------------------
    def deduct(self, user_id: int, amount: float):
        
        wallet = self.wallet_repo.get_by_user_id(user_id)

        if wallet is None:
            raise Exception("Wallet not found")
        

        if wallet.balance < amount:
            raise Exception("Insufficient balance")
        
        wallet.balance -= amount
        self.wallet_repo.session.add(wallet)
        self.wallet_repo.session.commit()

        self.transaction_repo.session.add(
            self.transaction_repo.model(
                user_id=user_id,
                wallet_id=wallet.id,
                amount=amount,
                type=TransactionType.DEBIT,
                created_at=datetime.utcnow()
            )
        )
        self.transaction_repo.session.commit()

        return wallet
    
    # -------------------------
    # REFUND (Req 4.4)
    # -------------------------
    def refund(self, user_id: int, amount: float):
        
        wallet = self.wallet_repo.get_by_user_id(user_id)

        if wallet is None:
            raise Exception("Wallet not found")
        
        wallet.balance += amount
        self.wallet_repo.session.add(wallet)
        self.wallet_repo.session.commit()

        self.transaction_repo.session.add(
            self.transaction_repo.model(
                user_id=user_id,
                wallet_id=wallet.id,
                amount=amount,
                type=TransactionType.REFUND,
                created_at=datetime.utcnow()
            )
        )
        self.transaction_repo.session.commit()

        return wallet
    
    # -------------------------
    # PAYMENT MOCK (Req 4.1, 4.6)
    # -------------------------
    def _process_payment(self, token: str, amount: float):
        if token is None:
            return False
        return True