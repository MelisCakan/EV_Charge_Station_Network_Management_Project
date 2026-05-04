from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.charging_session import ChargingSession
from app.models.reservation import Reservation
from app.models.charger import Charger
from app.models.vehicle import Vehicle
from app.models.digital_receipt import DigitalReceipt
from app.services.wallet_service import WalletService
from app.services.notification_service import NotificationService
from app.repositories.wallet_repository import WalletRepository, TransactionRepository


class SessionService:

    MAX_SESSION_MINUTES = 120  # REQ 1.9: max 2 saat

    @staticmethod
    def start_session(
        reservation_id: int,
        start_battery_level: float,
        charger_qr_code: int,
        user_id: int,
        db: Session,
    ) -> ChargingSession:
        """
        Sarj oturumu baslatir.
        REQ 1.21: QR kod dogrulamasi - prototipte charger_id eslesmesi ile simule edilir.
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
                detail=f"Reservation is '{reservation.status}', must be 'confirmed'",
            )

        # REQ 1.21: QR kod = charger_id eslesmesi
        if charger_qr_code != reservation.charger_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="QR code does not match the reserved charger",
            )

        # Ayni rezervasyon icin zaten session var mi?
        existing = db.exec(
            select(ChargingSession).where(
                ChargingSession.reservation_id == reservation_id
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A session already exists for this reservation",
            )

        # Batarya seviyesi validasyonu
        if not (0 <= start_battery_level <= 100):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Battery level must be between 0 and 100",
            )

        # Charger'i occupied yap
        charger = db.get(Charger, reservation.charger_id)
        if not charger:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Charger not found",
            )
        charger.status = "occupied"
        db.add(charger)

        # Reservation durumunu guncelle
        reservation.status = "active"
        db.add(reservation)

        # Session olustur
        charging_session = ChargingSession(
            reservation_id=reservation_id,
            start_battery_level=start_battery_level,
            status="active",
        )
        db.add(charging_session)
        db.commit()
        db.refresh(charging_session)
        return charging_session

    @staticmethod
    def get_progress(
        session_id: int,
        user_id: int,
        db: Session,
    ) -> dict:
        """
        Sarj ilerlemesini hesaplar (polling endpoint).
        Simulasyon: lineer sarj artisi - dakikada %0.5 artis.
        REQ 1.9 amendment: 2 saat dolunca otomatik tamamla.
        """
        cs = db.get(ChargingSession, session_id)
        if not cs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        reservation = db.get(Reservation, cs.reservation_id)
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found",
            )

        if reservation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not your session",
            )

        # Zaten tamamlanmissa mevcut degerleri don
        if cs.status == "completed":
            return {
                "session_id": cs.id,
                "current_battery_level": cs.end_battery_level or cs.start_battery_level,
                "energy_consumed": cs.energy_consumed or 0,
                "cost_so_far": cs.total_cost or 0,
                "elapsed_seconds": int((cs.completed_at - cs.started_at).total_seconds()) if cs.completed_at else 0,
                "status": "completed",
                "auto_completed": False,
            }

        charger = db.get(Charger, reservation.charger_id)
        vehicle = db.get(Vehicle, reservation.vehicle_id)

        now = datetime.utcnow()
        elapsed_seconds = (now - cs.started_at).total_seconds()
        elapsed_minutes = elapsed_seconds / 60

        # REQ 1.9 amendment: 2 saat dolunca otomatik tamamla
        if elapsed_minutes >= SessionService.MAX_SESSION_MINUTES:
            simulated_battery = min(
                cs.start_battery_level + (SessionService.MAX_SESSION_MINUTES * 0.5),
                100,
            )
            completed = SessionService.complete_session(
                session_id=session_id,
                end_battery_level=simulated_battery,
                user_id=user_id,
                db=db,
                auto=True,
            )
            return {
                "session_id": cs.id,
                "current_battery_level": completed.end_battery_level,
                "energy_consumed": completed.energy_consumed,
                "cost_so_far": completed.total_cost,
                "elapsed_seconds": int((completed.completed_at - completed.started_at).total_seconds()),
                "status": "completed",
                "auto_completed": True,
            }

        # Simulasyon: dakikada %0.5 batarya artisi
        simulated_battery = min(cs.start_battery_level + (elapsed_minutes * 0.5), 100)

        # Enerji ve maliyet hesapla
        energy_kwh = vehicle.battery_capacity * (simulated_battery - cs.start_battery_level) / 100
        cost = energy_kwh * charger.pricing_per_kwh

        return {
            "session_id": cs.id,
            "current_battery_level": round(simulated_battery, 1),
            "energy_consumed": round(energy_kwh, 2),
            "cost_so_far": round(cost, 2),
            "elapsed_seconds": int(elapsed_seconds),
            "status": "active",
            "auto_completed": False,
        }

    @staticmethod
    def complete_session(
        session_id: int,
        end_battery_level: float,
        user_id: int,
        db: Session,
        auto: bool = False,
    ) -> ChargingSession:
        """
        Sarj oturumunu tamamlar.
        REQ 1.13: Maliyet baslangic fiyatiyla hesaplanir.
        REQ 1.20: DigitalReceipt olusturulur.
        REQ 1.9 amendment: auto=True ise otomatik tamamlama (2 saat limiti).
        """
        cs = db.get(ChargingSession, session_id)
        if not cs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        reservation = db.get(Reservation, cs.reservation_id)
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found",
            )

        if reservation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not your session",
            )

        if cs.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Session is '{cs.status}', must be 'active'",
            )

        if not (0 <= end_battery_level <= 100):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Battery level must be between 0 and 100",
            )

        if end_battery_level < cs.start_battery_level:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End battery level cannot be lower than start level",
            )

        charger = db.get(Charger, reservation.charger_id)
        vehicle = db.get(Vehicle, reservation.vehicle_id)

        # REQ 1.13: Maliyet hesapla (baslangic fiyatiyla)
        energy_consumed = vehicle.battery_capacity * (end_battery_level - cs.start_battery_level) / 100
        total_cost = energy_consumed * charger.pricing_per_kwh

        # Session guncelle
        cs.end_battery_level = end_battery_level
        cs.energy_consumed = round(energy_consumed, 2)
        cs.total_cost = round(total_cost, 2)
        cs.status = "completed"
        cs.completed_at = datetime.utcnow()
        db.add(cs)

        # Charger'i available yap
        charger.status = "available"
        db.add(charger)

        # Reservation'i completed yap
        reservation.status = "completed"
        reservation.total_cost = round(total_cost, 2)
        db.add(reservation)

        # REQ 1.20: DigitalReceipt olustur
        receipt_number = f"RCP-{cs.completed_at.strftime('%Y%m%d%H%M%S')}-{cs.id}"
        receipt = DigitalReceipt(
            session_id=cs.id,
            receipt_number=receipt_number,
            total_amount=round(total_cost, 2),
            energy_consumed=round(energy_consumed, 2),
            unit_price=charger.pricing_per_kwh,
        )
        db.add(receipt)
        db.commit()

        # REQ 4.4: Sarj tamamlaninca otomatik cuzdan kesintisi
        if total_cost > 0:
            wallet_service = WalletService(
                WalletRepository(db),
                TransactionRepository(db),
            )
            wallet_service.deduct(
                user_id=user_id,
                amount=round(total_cost, 2),
                session_id=cs.id,
            )

        # Bildirim gonder
        if auto:
            # REQ 1.9 amendment: Otomatik tamamlama bildirimi
            NotificationService.send_auto_complete(
                user_id=user_id,
                session_id=cs.id,
                db=db,
            )
        else:
            NotificationService.send_charging_complete(
                user_id=user_id,
                session_id=cs.id,
                total_cost=round(total_cost, 2),
                db=db,
            )

        db.refresh(cs)
        return cs
