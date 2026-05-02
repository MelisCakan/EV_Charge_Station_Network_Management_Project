from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.database import get_session
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.vehicle import Vehicle
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.vehicle_schema import VehicleCreate, VehicleUpdate, VehicleRead
from app.services.compatibility_service import check_compatibility

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("", response_model=list[VehicleRead])
def get_my_vehicles(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    repo = VehicleRepository(session)
    return repo.get_by_user_id(current_user.id)


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    data: VehicleCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    repo = VehicleRepository(session)

    if data.connector_type not in ("CCS", "CHAdeMO", "Type2"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="connector_type must be CCS, CHAdeMO, or Type2",
        )

    existing = repo.get_by_plate_number(data.plate_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A vehicle with this plate number already exists",
        )

    vehicle = Vehicle(
        user_id=current_user.id,
        brand=data.brand,
        model=data.model,
        battery_capacity=data.battery_capacity,
        connector_type=data.connector_type,
        plate_number=data.plate_number,
    )
    return repo.create(vehicle)


@router.get("/{vehicle_id}", response_model=VehicleRead)
def get_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    repo = VehicleRepository(session)
    vehicle = repo.get_by_id(vehicle_id)

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    if vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your vehicle",
        )

    return vehicle


@router.put("/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    repo = VehicleRepository(session)
    vehicle = repo.get_by_id(vehicle_id)

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    if vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your vehicle",
        )

    update_data = data.model_dump(exclude_unset=True)

    if "connector_type" in update_data and update_data["connector_type"] not in ("CCS", "CHAdeMO", "Type2"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="connector_type must be CCS, CHAdeMO, or Type2",
        )

    if "plate_number" in update_data:
        existing = repo.get_by_plate_number(update_data["plate_number"])
        if existing and existing.id != vehicle_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A vehicle with this plate number already exists",
            )

    for key, value in update_data.items():
        setattr(vehicle, key, value)

    return repo.update(vehicle)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    repo = VehicleRepository(session)
    vehicle = repo.get_by_id(vehicle_id)

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    if vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your vehicle",
        )

    repo.delete(vehicle)


@router.get("/{vehicle_id}/compatibility/{charger_id}")
def check_vehicle_charger_compatibility(
    vehicle_id: int,
    charger_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    repo = VehicleRepository(session)
    vehicle = repo.get_by_id(vehicle_id)

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    if vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your vehicle",
        )

    return check_compatibility(vehicle_id, charger_id, session)
