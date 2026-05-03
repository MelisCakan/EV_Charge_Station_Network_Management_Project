from datetime import datetime
from typing import TypedDict, Union


class NotificationService:

    # -------------------------
    # RESERVATION NOTIFICATION
    # -------------------------
    def send_reservation_confirmation(self, user_id: int, reservation):
        message = {
            "user_id": user_id,
            "type": "RESERVATION_CONFIRMED",
            "station_id": reservation.station_id,
            "start_time": reservation.start_time,
            "end_time": reservation.end_time,
            "created_at": datetime.utcnow()
        }

        self._send(message)
        return message
    
    # -------------------------
    # CHARGING START NOTIFICATION
    # -------------------------
    def send_charging_started(self, user_id: int, session):
        message = {
            "user_id": user_id,
            "type": "CHARGING_STARTED",
            "session_id": session.id,
            "station_id": session.station_id,
            "created_at": datetime.utcnow()
        }

        self._send(message)
        return message
    
    # -------------------------
    # CHARGING COMPLETED + RECEIPT
    # -------------------------
    def send_receipt(self, user_id: int, session):
        message = {
            "user_id": user_id,
            "type": "CHARGING_COMPLETED",
            "session_id": session.id,
            "total_kwh": session.total_kwh,
            "total_cost": session.total_cost,
            "created_at": datetime.utcnow()
        }

        self._send(message)
        return message
    
    # -------------------------
    # LOW BALANCE WARNING
    # -------------------------
    def send_low_balance_warning(self, user_id: int, balance: float):
        message = {
            "user_id": user_id,
            "type": "LOW_BALANCE_WARNING",
            "balance": balance,
            "created_at": datetime.utcnow()
        }

        self._send(message)
        return message
    
    # -------------------------
    # INTERNAL SENDER (MOCK)
    # -------------------------
    def _send(self, message: dict):
        """
        Real sistemde:
        - Email service
        - Push notification (Firebase)
        - SMS gateway
        """

        print(f"[NOTIFICATION] {message}")