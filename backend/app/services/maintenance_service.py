from datetime import datetime
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.charger import Charger
from app.models.reservation import Reservation
from app.services.wallet_service import WalletService
from app.services.notification_service import NotificationService
from app.repositories.wallet_repository import WalletRepository, TransactionRepository


class MaintenanceService:
    """
    UC3: Maintenance & Issue Reporting workflow.
    REQ 2.4 amendment: Charger offline → aktif rezervasyonlar iptal + %100 iade.
    REQ 2.11: Bildirim <=30 saniye icinde iletilir.
    """

    @staticmethod
    def mark_charger_offline(charger_id: int, operator_user_id: int, db: Session) -> dict:
        charger = db.get(Charger, charger_id)
        if not charger:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Charger not found",
            )

        if charger.status == "offline":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Charger is already offline",
            )

        # Charger'i offline yap
        charger.status = "offline"
        db.add(charger)

        # Gelecek tarihli confirmed reservation'lari bul
        now = datetime.utcnow()
        reservations = list(db.exec(
            select(Reservation).where(
                Reservation.charger_id == charger_id,
                Reservation.status == "confirmed",
                Reservation.start_time >= now,
            )
        ).all())

        cancelled_count = 0
        wallet_service = WalletService(WalletRepository(db), TransactionRepository(db))

        for reservation in reservations:
            reservation.status = "cancelled"
            db.add(reservation)

            # REQ 2.4 amendment: %100 iade (total_cost varsa)
            if reservation.total_cost and reservation.total_cost > 0:
                wallet_service.refund(
                    user_id=reservation.user_id,
                    amount=reservation.total_cost,
                )

            # REQ 2.11: Maintenance bildirimi
            NotificationService.send(
                user_id=reservation.user_id,
                message=f"Charger maintenance: Your reservation #{reservation.id} has been cancelled. Full refund issued.",
                notif_type="maintenance",
                db=db,
            )

            cancelled_count += 1

        db.commit()

        return {
            "charger_id": charger_id,
            "new_status": "offline",
            "cancelled_count": cancelled_count,
        }

    @staticmethod
    def mark_charger_available(charger_id: int, operator_user_id: int, db: Session) -> dict:
        charger = db.get(Charger, charger_id)
        if not charger:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Charger not found",
            )

        if charger.status == "available":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Charger is already available",
            )

        charger.status = "available"
        db.add(charger)
        db.commit()

        return {
            "charger_id": charger_id,
            "new_status": "available",
        }
