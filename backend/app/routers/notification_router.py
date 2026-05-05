from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import SQLModel, Session
from datetime import datetime
from typing import Optional

from app.database import get_session
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository


# ─── Response Schema ───

class NotificationResponse(SQLModel):
    id: int
    user_id: int
    message: str
    type: str
    sent_at: datetime
    is_read: bool


# ─── Router ───

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def get_my_notifications(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Kullanicinin tum bildirimlerini listeler."""
    repo = NotificationRepository(session)
    return repo.get_by_user_id(current_user.id)


@router.get("/unread", response_model=list[NotificationResponse])
def get_unread_notifications(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Okunmamis bildirimleri listeler."""
    repo = NotificationRepository(session)
    return repo.get_unread_by_user_id(current_user.id)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Bildirimi okundu olarak isaretle."""
    notification = session.get(Notification, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your notification",
        )

    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification
