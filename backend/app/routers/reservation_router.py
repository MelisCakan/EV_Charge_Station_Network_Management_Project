from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.database import get_session
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.reservation_schema import ReservationCreate, ReservationResponse
from app.services.reservation_service import ReservationService
from app.services.compatibility_service import check_compatibility

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
def create_reservation(
    data: ReservationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # REQ 7.2: Compatibility check
    compat = check_compatibility(
        vehicle_id=data.vehicle_id,
        charger_id=data.charger_id,
        session=session,
    )

    if not compat["is_compatible"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=compat["message"],
        )

    return ReservationService.create_reservation(
        data=data,
        user=current_user,
        db=session,
    )


@router.get("", response_model=list[ReservationResponse])
def get_my_reservations(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return ReservationService.get_user_reservations(
        user_id=current_user.id,
        db=session,
    )


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ReservationService.cancel_reservation(
        reservation_id=reservation_id,
        user_id=current_user.id,
        db=session,
    )


@router.post("/{reservation_id}/noshow", status_code=status.HTTP_200_OK)
def check_noshow(
    reservation_id: int,
    session: Session = Depends(get_session),
):
    """REQ 1.19: No-show check endpoint (15 min rule)"""
    ReservationService.check_noshow(
        reservation_id=reservation_id,
        db=session,
    )
    return {"message": "No-show check completed"}
