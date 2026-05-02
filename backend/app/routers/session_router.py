from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.digital_receipt import DigitalReceipt
from app.schemas.session_schema import (
    SessionStart,
    SessionComplete,
    SessionResponse,
    SessionProgressResponse,
    ReceiptResponse,
    ReceiptDetailResponse,
)
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["Charging Sessions"])


@router.post("/start", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def start_session(
    data: SessionStart,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Sarj oturumu baslatir.
    REQ 1.21: charger_qr_code, rezervasyondaki charger_id ile eslesmelidir.
    """
    cs = SessionService.start_session(
        reservation_id=data.reservation_id,
        start_battery_level=data.start_battery_level,
        charger_qr_code=data.charger_qr_code,
        user_id=current_user.id,
        db=session,
    )
    return cs


@router.get("/{session_id}/progress", response_model=SessionProgressResponse)
def get_progress(
    session_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Sarj ilerlemesini dondurur (polling endpoint).
    REQ 1.9 amendment: 2 saat dolunca otomatik tamamlar.
    """
    return SessionService.get_progress(
        session_id=session_id,
        user_id=current_user.id,
        db=session,
    )


@router.post("/{session_id}/complete", response_model=SessionResponse)
def complete_session(
    session_id: int,
    data: SessionComplete,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Sarj oturumunu tamamlar.
    REQ 1.13: Maliyet baslangic fiyatiyla hesaplanir.
    REQ 1.20: DigitalReceipt otomatik olusturulur.
    """
    return SessionService.complete_session(
        session_id=session_id,
        end_battery_level=data.end_battery_level,
        user_id=current_user.id,
        db=session,
    )


# --- Receipt Endpoints (REQ 1.20) ---


def _build_receipt_detail(receipt: DigitalReceipt, db: Session) -> ReceiptDetailResponse:
    """Receipt + session/station/charger bilgilerini birlestirerek REQ 1.20 detay olusturur."""
    from app.models.charging_session import ChargingSession
    from app.models.reservation import Reservation
    from app.models.charger import Charger
    from app.models.station import ChargingStation

    cs = db.get(ChargingSession, receipt.session_id)
    reservation = db.get(Reservation, cs.reservation_id)
    charger = db.get(Charger, reservation.charger_id)
    station = db.get(ChargingStation, reservation.station_id)

    return ReceiptDetailResponse(
        id=receipt.id,
        receipt_number=receipt.receipt_number,
        session_id=receipt.session_id,
        session_start=cs.started_at,
        session_end=cs.completed_at,
        station_name=station.name,
        charger_code=charger.charger_code,
        charger_id=charger.id,
        energy_consumed=receipt.energy_consumed,
        unit_price=receipt.unit_price,
        total_amount=receipt.total_amount,
        issued_at=receipt.issued_at,
    )


@router.get("/receipts/my", response_model=list[ReceiptDetailResponse])
def get_my_receipts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """REQ 1.20: Kullanicinin tum makbuzlarini listeler."""
    from app.models.charging_session import ChargingSession
    from app.models.reservation import Reservation

    receipts = session.exec(
        select(DigitalReceipt)
        .join(ChargingSession, DigitalReceipt.session_id == ChargingSession.id)
        .join(Reservation, ChargingSession.reservation_id == Reservation.id)
        .where(Reservation.user_id == current_user.id)
        .order_by(DigitalReceipt.issued_at.desc())
    ).all()

    return [_build_receipt_detail(r, session) for r in receipts]


@router.get("/receipts/{receipt_id}", response_model=ReceiptDetailResponse)
def get_receipt(
    receipt_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """REQ 1.20: Makbuz detayi (tarih, istasyon, charger, kWh, birim fiyat, toplam, receipt no)."""
    from app.models.charging_session import ChargingSession
    from app.models.reservation import Reservation

    receipt = session.get(DigitalReceipt, receipt_id)
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found",
        )

    cs = session.get(ChargingSession, receipt.session_id)
    reservation = session.get(Reservation, cs.reservation_id)
    if reservation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your receipt",
        )

    return _build_receipt_detail(receipt, session)
