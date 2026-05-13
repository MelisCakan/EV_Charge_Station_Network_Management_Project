from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.core.dependencies import get_current_user, get_current_operator
from app.models.user import User
from app.models.issue_report import IssueReport
from app.models.maintenance_note import MaintenanceNote
from app.models.charger import Charger
from app.models.station import ChargingStation
from app.services.notification_service import NotificationService
from app.schemas.issue_schema import (
    IssueCreateRequest,
    IssueUpdateRequest,
    IssueResponse,
    MaintenanceNoteCreate,
    MaintenanceNoteResponse,
)

router = APIRouter(prefix="/issues", tags=["Issue Reports"])


@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
def create_issue(
    data: IssueCreateRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Ariza raporu olustur (driver veya operator)."""
    charger = session.get(Charger, data.charger_id)
    if not charger:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Charger not found",
        )

    if data.category not in ("hardware", "software", "payment", "other"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category. Must be: hardware, software, payment, other",
        )

    issue = IssueReport(
        user_id=current_user.id,
        charger_id=data.charger_id,
        description=data.description,
        category=data.category,
    )
    session.add(issue)
    session.commit()
    session.refresh(issue)

    # Notify operators and admins about the new issue
    station = None
    if charger.station_id:
        station = session.get(ChargingStation, charger.station_id)
    station_name = station.name if station else f"Station #{charger.station_id}"
    msg = f"New {data.category} issue reported: \"{data.description}\" — {charger.charger_code} at {station_name}"
    NotificationService.send_to_role("operator", msg, "issue_reported", session)
    NotificationService.send_to_role("admin", msg, "issue_reported", session)

    return issue


@router.get("", response_model=list[IssueResponse])
def list_issues(
    current_user: User = Depends(get_current_operator),
    session: Session = Depends(get_session),
):
    """Tum ariza raporlari listesi (operator/admin)."""
    return list(session.exec(
        select(IssueReport).order_by(IssueReport.reported_at.desc())
    ).all())


@router.put("/{issue_id}", response_model=IssueResponse)
def update_issue_status(
    issue_id: int,
    data: IssueUpdateRequest,
    current_user: User = Depends(get_current_operator),
    session: Session = Depends(get_session),
):
    """Ariza durumunu guncelle (operator)."""
    issue = session.get(IssueReport, issue_id)
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found",
        )

    if data.status not in ("open", "in_progress", "resolved"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be: open, in_progress, resolved",
        )

    old_status = issue.status
    issue.status = data.status
    session.add(issue)
    session.commit()
    session.refresh(issue)

    # Notify the driver who reported the issue
    if issue.user_id:
        NotificationService.send(
            user_id=issue.user_id,
            message=f"Your issue #{issue_id} status changed from {old_status} to {data.status}.",
            notif_type="issue_update",
            db=session,
        )

    # Notify admins about the status change
    NotificationService.send_to_role(
        "admin",
        f"Issue #{issue_id} status changed to {data.status} by operator.",
        "issue_update",
        session,
    )

    return issue


@router.post("/{issue_id}/notes", response_model=MaintenanceNoteResponse, status_code=status.HTTP_201_CREATED)
def add_maintenance_note(
    issue_id: int,
    data: MaintenanceNoteCreate,
    current_user: User = Depends(get_current_operator),
    session: Session = Depends(get_session),
):
    """Bakim notu ekle (operator)."""
    issue = session.get(IssueReport, issue_id)
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found",
        )

    note = MaintenanceNote(
        issue_report_id=issue_id,
        user_id=current_user.id,
        content=data.content,
    )
    session.add(note)
    session.commit()
    session.refresh(note)
    return note
