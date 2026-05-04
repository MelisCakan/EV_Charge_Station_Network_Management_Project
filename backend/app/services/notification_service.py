from sqlmodel import Session

from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository


class NotificationService:
    """
    REQ 2.11: Bildirimler olay tetiklenmesinden itibaren <=30 saniye icinde iletilir.
    Prototipte bildirimler DB'ye kaydedilir (push notification yok).
    """

    # -------------------------
    # GENERIC SEND
    # -------------------------
    @staticmethod
    def send(user_id: int, message: str, notif_type: str, db: Session) -> Notification:
        repo = NotificationRepository(db)
        notification = Notification(
            user_id=user_id,
            message=message,
            type=notif_type,
        )
        return repo.create(notification)

    # -------------------------
    # RESERVATION NOTIFICATION
    # -------------------------
    @staticmethod
    def send_reservation_confirmed(user_id: int, reservation_id: int, db: Session) -> Notification:
        return NotificationService.send(
            user_id=user_id,
            message=f"Reservation #{reservation_id} confirmed.",
            notif_type="reservation_confirm",
            db=db,
        )

    # -------------------------
    # CHARGING COMPLETED
    # -------------------------
    @staticmethod
    def send_charging_complete(user_id: int, session_id: int, total_cost: float, db: Session) -> Notification:
        return NotificationService.send(
            user_id=user_id,
            message=f"Charging session #{session_id} completed. Total: {total_cost:.2f} TL",
            notif_type="charging_complete",
            db=db,
        )

    # -------------------------
    # AUTO COMPLETE (REQ 1.9 amendment)
    # -------------------------
    @staticmethod
    def send_auto_complete(user_id: int, session_id: int, db: Session) -> Notification:
        """REQ 1.9 amendment: 2 saat limiti dolunca otomatik tamamlama bildirimi."""
        return NotificationService.send(
            user_id=user_id,
            message=f"Your charging session #{session_id} has been automatically completed due to the 2-hour time limit.",
            notif_type="charging_complete",
            db=db,
        )

    # -------------------------
    # LOW BALANCE WARNING (REQ 1.15 amendment)
    # -------------------------
    @staticmethod
    def send_low_balance(user_id: int, balance: float, db: Session) -> Notification:
        """REQ 1.15 amendment: Bakiye 50 TL altina dustugunde bildirim."""
        return NotificationService.send(
            user_id=user_id,
            message=f"Your wallet balance is below 50 TL ({balance:.2f} TL). Please top up to avoid interruptions.",
            notif_type="low_balance",
            db=db,
        )
