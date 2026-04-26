from datetime import datetime
from typing import Optional
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class IssueReport(SQLModel, table=True):
    __tablename__ = "issue_reports"
    __table_args__ = (
        Index("ix_issue_reports_status_reported_at", "status", "reported_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    charger_id: int = Field(foreign_key="charger.id", index=True)
    description: str
    category: str  # hardware | software | payment | other
    status: str = Field(default="open")  # open | in_progress | resolved
    reported_at: datetime = Field(default_factory=datetime.utcnow)
