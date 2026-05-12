from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func

from app.database import get_session
from app.core.dependencies import get_current_operator, get_current_admin
from app.models.user import User
from app.models.station import ChargingStation
from app.models.charging_session import ChargingSession
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


@router.get("/stats")
def get_admin_stats(
    current_user: User = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Admin dashboard istatistikleri: station, user, session, revenue."""
    total_stations = session.exec(
        select(func.count(ChargingStation.id))
    ).one()

    total_users = session.exec(
        select(func.count(User.id)).where(User.role == "driver")
    ).one()

    active_sessions = session.exec(
        select(func.count(ChargingSession.id)).where(ChargingSession.status == "active")
    ).one()

    total_revenue = session.exec(
        select(func.coalesce(func.sum(ChargingSession.total_cost), 0.0)).where(
            ChargingSession.status == "completed"
        )
    ).one()

    return {
        "total_stations": total_stations,
        "total_users": total_users,
        "active_sessions": active_sessions,
        "total_revenue": round(float(total_revenue), 2),
    }
