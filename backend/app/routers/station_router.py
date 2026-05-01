from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session
from typing import Optional

from app.database import get_session
from app.repositories.station_repository import StationRepository
from app.repositories.charger_repository import ChargerRepository
from app.schemas.station_schema import StationRead, ChargerRead

router = APIRouter(prefix="/stations", tags=["Stations"])


@router.get("", response_model=list[StationRead])
def get_stations(
    city: Optional[str] = Query(None, description="Filter by city"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (active/inactive)"),
    session: Session = Depends(get_session),
):
    repo = StationRepository(session)

    if city:
        stations = repo.get_by_city(city)
    elif status_filter:
        if status_filter == "active":
            stations = repo.get_active()
        else:
            stations = repo.get_all()
            stations = [s for s in stations if s.status == status_filter]
    else:
        stations = repo.get_all()

    return stations


@router.get("/{station_id}", response_model=StationRead)
def get_station(
    station_id: int,
    session: Session = Depends(get_session),
):
    repo = StationRepository(session)
    station = repo.get_by_id(station_id)

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )

    return station


@router.get("/{station_id}/chargers", response_model=list[ChargerRead])
def get_station_chargers(
    station_id: int,
    connector_type: Optional[str] = Query(None, description="Filter by connector type"),
    charger_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    session: Session = Depends(get_session),
):
    station_repo = StationRepository(session)
    station = station_repo.get_by_id(station_id)

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )

    charger_repo = ChargerRepository(session)
    chargers = charger_repo.get_by_station_id(station_id)

    if connector_type:
        chargers = [c for c in chargers if c.connector_type == connector_type]

    if charger_status:
        chargers = [c for c in chargers if c.status == charger_status]

    return chargers
