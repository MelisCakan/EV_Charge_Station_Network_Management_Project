from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.vehicle import Vehicle
from app.models.charger import Charger


def check_compatibility(vehicle_id: int, charger_id: int, session: Session) -> dict:
    """
    REQ 7.2: Aracin connector_type ile Charger'in connector_type birebir eslesmelidir.
    Eslesmeme durumunda rezervasyon reddedilir.
    """
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    charger = session.get(Charger, charger_id)
    if not charger:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Charger not found",
        )

    connector_match = vehicle.connector_type == charger.connector_type

    return {
        "is_compatible": connector_match,
        "vehicle_connector": vehicle.connector_type,
        "charger_connector": charger.connector_type,
        "message": "Uyumlu" if connector_match else f"{vehicle.connector_type} ile {charger.connector_type} uyumsuz",
    }
