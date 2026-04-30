from typing import Optional
from sqlmodel import Session, select

from app.models.wallet import Wallet, Transaction
from app.repositories.base import BaseRepository


class WalletRepository(BaseRepository[Wallet]):

    def __init__(self, session: Session):
        super().__init__(Wallet, session)

    def get_by_user_id(self, user_id: int) -> Optional[Wallet]:
        return self.session.exec(
            select(Wallet).where(Wallet.user_id == user_id)
        ).first()


class TransactionRepository(BaseRepository[Transaction]):

    def __init__(self, session: Session):
        super().__init__(Transaction, session)

    def get_by_wallet_id(self, wallet_id: int) -> list[Transaction]:
        return list(self.session.exec(
            select(Transaction)
            .where(Transaction.wallet_id == wallet_id)
            .order_by(Transaction.timestamp.desc())
        ).all())

    def get_by_session_id(self, session_id: int) -> list[Transaction]:
        return list(self.session.exec(
            select(Transaction).where(Transaction.session_id == session_id)
        ).all())
