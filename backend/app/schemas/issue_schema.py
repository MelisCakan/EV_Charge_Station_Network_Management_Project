from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel


# ─── Issue Report ───

class IssueCreateRequest(SQLModel):
    charger_id: int
    description: str
    category: str  # hardware | software | payment | other


class IssueUpdateRequest(SQLModel):
    status: str  # open | in_progress | resolved


class IssueResponse(SQLModel):
    id: int
    user_id: int
    charger_id: int
    description: str
    category: str
    status: str
    reported_at: datetime


# ─── Maintenance Note ───

class MaintenanceNoteCreate(SQLModel):
    content: str


class MaintenanceNoteResponse(SQLModel):
    id: int
    issue_report_id: int
    user_id: int
    content: str
    created_at: datetime


# ─── Admin Charger Status ───

class ChargerStatusUpdate(SQLModel):
    status: str  # offline | available
