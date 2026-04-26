from datetime import datetime
from typing import Optional
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class Notification(SQLModel, table=True):
    __table_args__ = (
        Index("ix_notification_user_read_sent", "user_id", "is_read", "sent_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    message: str
    type: str  # reservation_confirm | charging_complete | low_balance | maintenance
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = Field(default=False)
