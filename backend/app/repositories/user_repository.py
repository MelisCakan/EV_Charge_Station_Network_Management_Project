from typing import Optional
from sqlmodel import Session, select

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):

    def __init__(self, session: Session):
        super().__init__(User, session)

    def get_by_email(self, email: str) -> Optional[User]:
        return self.session.exec(
            select(User).where(User.email == email)
        ).first()

    def get_by_role(self, role: str) -> list[User]:
        return list(self.session.exec(
            select(User).where(User.role == role)
        ).all())

    def email_exists(self, email: str) -> bool:
        return self.get_by_email(email) is not None
