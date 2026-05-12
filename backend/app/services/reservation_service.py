from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.reservation import Reservation
from app.models.wallet import Wallet
from app.models.charger import Charger
from app.services.wallet_service import WalletService
from app.repositories.wallet_repository import WalletRepository, TransactionRepository

RESERVATION_FEE = 50.0


class ReservationService:

    @staticmethod
    def _naive(dt: datetime) -> datetime:
        """Strip timezone info for consistent comparison."""
        if dt.tzinfo is not None:
            return dt.replace(tzinfo=None)
        return dt

    @staticmethod
    def create_reservation(data, user, db: Session):
        # RULE 1: Max 2 hours
        if data.duration_minutes > 120:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum reservation duration is 2 hours",
            )

        # RULE 2: Max 24 hours in advance
        now = datetime.utcnow()
        start = ReservationService._naive(data.start_time)
        if start > now + timedelta(hours=72):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reserve more than 72 hours in advance",
            )

        # Cannot reserve in the past
        if start < now - timedelta(minutes=5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reserve in the past",
            )

        # Calculate end time
        end_time = start + timedelta(minutes=data.duration_minutes)

        # RULE 3: Conflict check (only against active reservations)
        conflict = db.exec(
            select(Reservation).where(
                Reservation.charger_id == data.charger_id,
                Reservation.status.in_(["confirmed"]),
                Reservation.start_time < end_time,
                Reservation.end_time > start,
            )
        ).first()

        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This charger is already reserved for the selected time",
            )

        # Deduct reservation fee from wallet (50 TL)
        wallet_service = WalletService(WalletRepository(db), TransactionRepository(db))
        wallet_service.deduct(user_id=user.id, amount=RESERVATION_FEE)

        # Create reservation
        reservation = Reservation(
            user_id=user.id,
            vehicle_id=data.vehicle_id,
            station_id=data.station_id,
            charger_id=data.charger_id,
            start_time=start,
            end_time=end_time,
            status="confirmed",
            total_cost=RESERVATION_FEE,
        )

        db.add(reservation)
        db.commit()
        db.refresh(reservation)
        return reservation

    @staticmethod
    def get_user_reservations(user_id: int, db: Session):
        return list(db.exec(
            select(Reservation).where(Reservation.user_id == user_id)
        ).all())

    @staticmethod
    def cancel_reservation(reservation_id: int, user_id: int, db: Session):
        """
        REQ 1.18: Cancellation penalty rules
        - >= 30 min before start → 100% refund
        - < 30 min before start → 80% refund (20% penalty)
        - After start time → cannot cancel
        """
        reservation = db.get(Reservation, reservation_id)
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found",
            )

        if reservation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not your reservation",
            )

        if reservation.status != "confirmed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel a {reservation.status} reservation",
            )

        now = datetime.utcnow()

        # After start time → cannot cancel
        if now >= reservation.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel after reservation start time",
            )

        time_until_start = (reservation.start_time - now).total_seconds() / 60

        # Calculate refund based on penalty rules
        if reservation.total_cost and reservation.total_cost > 0:
            wallet = db.exec(
                select(Wallet).where(Wallet.user_id == user_id)
            ).first()

            if wallet:
                if time_until_start >= 30:
                    # >= 30 min before → 100% refund
                    wallet.balance += reservation.total_cost
                else:
                    # < 30 min before → 80% refund (20% penalty)
                    wallet.balance += reservation.total_cost * 0.8

                db.add(wallet)

        reservation.status = "cancelled"
        db.add(reservation)
        db.commit()

    @staticmethod
    def check_noshow(reservation_id: int, db: Session):
        """
        REQ 1.19: No-show control
        - 15 min after start time, if no session started → auto cancel
        - 50% penalty applied, charger freed
        """
        reservation = db.get(Reservation, reservation_id)
        if not reservation or reservation.status != "confirmed":
            return

        now = datetime.utcnow()
        minutes_after_start = (now - reservation.start_time).total_seconds() / 60

        if minutes_after_start >= 15:
            # Mark as no_show
            reservation.status = "no_show"

            # 50% penalty
            if reservation.total_cost and reservation.total_cost > 0:
                wallet = db.exec(
                    select(Wallet).where(Wallet.user_id == reservation.user_id)
                ).first()
                if wallet:
                    wallet.balance += reservation.total_cost * 0.5
                    db.add(wallet)

            db.add(reservation)
            db.commit()
