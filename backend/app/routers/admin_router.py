from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.database import get_session
from app.core.dependencies import get_current_operator, get_current_admin
from app.models.user import User
from app.schemas.issue_schema import ChargerStatusUpdate
from app.services.maintenance_service import MaintenanceService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.put("/chargers/{charger_id}/status")
def update_charger_status(
    charger_id: int,
    data: ChargerStatusUpdate,
    current_user: User = Depends(get_current_operator),
    session: Session = Depends(get_session),
):
    """Charger durumunu degistir (operator/admin). Offline yapildiginda aktif rez'lar iptal edilir."""
    if data.status not in ("offline", "available"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be: offline, available",
        )

    if data.status == "offline":
        return MaintenanceService.mark_charger_offline(
            charger_id=charger_id,
            operator_user_id=current_user.id,
            db=session,
        )
    else:
        return MaintenanceService.mark_charger_available(
            charger_id=charger_id,
            operator_user_id=current_user.id,
            db=session,
        )


# ─── Stub Endpoints (Not Implemented Yet) ───

@router.get("/revenue")
def get_revenue(current_user: User = Depends(get_current_admin)):
    """Revenue analytics — not implemented yet."""
    return {"message": "This function has not been implemented yet."}


@router.get("/utilization")
def get_utilization(current_user: User = Depends(get_current_admin)):
    """Utilization analytics — not implemented yet."""
    return {"message": "This function has not been implemented yet."}


@router.get("/peak-hours")
def get_peak_hours(current_user: User = Depends(get_current_admin)):
    """Peak hours analytics — not implemented yet."""
    return {"message": "This function has not been implemented yet."}
