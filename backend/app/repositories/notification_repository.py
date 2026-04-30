from sqlmodel import Session, select

from app.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):

    def __init__(self, session: Session):
        super().__init__(Notification, session)

    def get_by_user_id(self, user_id: int) -> list[Notification]:
        return list(self.session.exec(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.sent_at.desc())
        ).all())

    def get_unread_by_user_id(self, user_id: int) -> list[Notification]:
        return list(self.session.exec(
            select(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
            .order_by(Notification.sent_at.desc())
        ).all())

    def mark_as_read(self, notification_id: int) -> bool:
        notification = self.get_by_id(notification_id)
        if notification:
            notification.is_read = True
            self.update(notification)
            return True
        return False
