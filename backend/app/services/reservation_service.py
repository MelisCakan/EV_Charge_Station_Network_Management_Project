from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.reservation import Reservation


class ReservationService:

    @staticmethod
    def create_reservation(data, user, db:Session):

        # RULE 1: Max 2 hours
        if data.duration_minutes > 120:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum reservation duration is 2 hours"
            )
        
        # RULE 2: 24 hours limit
        if data.start_time > datetime.now() + timedelta(hours=24):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reserve more than 24 hours in advance"
            )
        
        # END TIME calculate
        end_time = data.start_time + timedelta(minutes=data.duration_minutes)

        #RULE 3: Conflict check
        statement = select(Reservation).where(
            Reservation.charger_id == data.charger_id
        )
        existing_reservations = db.exec(statement).all()

        for r in existing_reservations:
            if r.start_time < end_time and r.end_time > data.start_time:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This charger is already reserved for the selected time"
                )
            
        # DB insert
        reservation = Reservation(
            user_id=user.id,
            vehicle_id=data.vehicle_id,
            station_id=data.station_id,
            charger_id=data.charger_id,
            start_time=data.start_time,
            end_time=end_time,
            status="confirmed",
            total_cost=None 
        )

        db.add(reservation)
        db.commit()
        db.refresh(reservation)

        return reservation    