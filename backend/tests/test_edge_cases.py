"""
Gorev 4.3: Edge Case Tests
404 hatalari, yetkilendirme kontrolleri, is kurali sinir durumlari.

Test edilen fonksiyonlar:
  - SessionService.start_session()     — session_service.py
  - SessionService.complete_session()  — session_service.py
Strateji: Guideline-based Testing (hata mesajlarini tetikleyen senaryolar)
"""

import pytest
from datetime import datetime, timedelta
from fastapi import HTTPException

from app.services.session_service import SessionService
from app.models.charging_session import ChargingSession
from app.models.reservation import Reservation


# ═══════════════════════════════════════════════════════
#  A. 404 — Olmayan Resource
# ═══════════════════════════════════════════════════════

class TestNotFound:

    def test_start_session_reservation_not_found(self, session, test_user):
        """Olmayan reservation_id ile session start → 404."""
        with pytest.raises(HTTPException) as exc:
            SessionService.start_session(
                reservation_id=9999,
                start_battery_level=20.0,
                charger_qr_code=1,
                user_id=test_user.id,
                db=session,
            )
        assert exc.value.status_code == 404
        assert "Reservation not found" in exc.value.detail

    def test_get_progress_session_not_found(self, session, test_user):
        """Olmayan session_id ile progress → 404."""
        with pytest.raises(HTTPException) as exc:
            SessionService.get_progress(
                session_id=9999,
                user_id=test_user.id,
                db=session,
            )
        assert exc.value.status_code == 404
        assert "Session not found" in exc.value.detail

    def test_complete_session_not_found(self, session, test_user):
        """Olmayan session_id ile complete → 404."""
        with pytest.raises(HTTPException) as exc:
            SessionService.complete_session(
                session_id=9999,
                end_battery_level=80.0,
                user_id=test_user.id,
                db=session,
            )
        assert exc.value.status_code == 404
        assert "Session not found" in exc.value.detail


# ═══════════════════════════════════════════════════════
#  B. 403 — Yetkilendirme (Baskasinin Kaynaklari)
# ═══════════════════════════════════════════════════════

class TestAuthorization:

    def test_start_session_not_your_reservation(
        self, session, test_user_2, test_reservation, test_charger_ccs
    ):
        """Baska kullanicinin reservation'ina session baslatamazsin → 403."""
        with pytest.raises(HTTPException) as exc:
            SessionService.start_session(
                reservation_id=test_reservation.id,
                start_battery_level=20.0,
                charger_qr_code=test_charger_ccs.id,
                user_id=test_user_2.id,
                db=session,
            )
        assert exc.value.status_code == 403
        assert "Not your reservation" in exc.value.detail

    def test_get_progress_not_your_session(
        self, session, test_user_2, test_active_session
    ):
        """Baska kullanicinin session progress'ini goremezsin → 403."""
        with pytest.raises(HTTPException) as exc:
            SessionService.get_progress(
                session_id=test_active_session.id,
                user_id=test_user_2.id,
                db=session,
            )
        assert exc.value.status_code == 403
        assert "Not your session" in exc.value.detail

    def test_complete_session_not_your_session(
        self, session, test_user_2, test_active_session, test_wallet
    ):
        """Baska kullanicinin session'ini tamamlayamazsin → 403."""
        with pytest.raises(HTTPException) as exc:
            SessionService.complete_session(
                session_id=test_active_session.id,
                end_battery_level=80.0,
                user_id=test_user_2.id,
                db=session,
            )
        assert exc.value.status_code == 403
        assert "Not your session" in exc.value.detail


# ═══════════════════════════════════════════════════════
#  C. Is Kurali Edge Cases
# ═══════════════════════════════════════════════════════

class TestBusinessRules:

    def test_duplicate_session_for_reservation(
        self, session, test_user, test_reservation, test_charger_ccs
    ):
        """Ayni reservation icin 2. session olusturulamaz → 409."""
        # Ilk session'i olustur (reservation "active" olur)
        SessionService.start_session(
            reservation_id=test_reservation.id,
            start_battery_level=30.0,
            charger_qr_code=test_charger_ccs.id,
            user_id=test_user.id,
            db=session,
        )
        # Reservation artik "active" — tekrar start denendiginde
        # status kontrolu yakalayacak (confirmed olmadigi icin)
        with pytest.raises(HTTPException) as exc:
            SessionService.start_session(
                reservation_id=test_reservation.id,
                start_battery_level=30.0,
                charger_qr_code=test_charger_ccs.id,
                user_id=test_user.id,
                db=session,
            )
        assert exc.value.status_code == 400
        assert "must be 'confirmed'" in exc.value.detail

    def test_start_session_cancelled_reservation(
        self, session, test_user, test_reservation, test_charger_ccs
    ):
        """Cancelled reservation ile session baslatilamaz → 400."""
        test_reservation.status = "cancelled"
        session.add(test_reservation)
        session.commit()

        with pytest.raises(HTTPException) as exc:
            SessionService.start_session(
                reservation_id=test_reservation.id,
                start_battery_level=20.0,
                charger_qr_code=test_charger_ccs.id,
                user_id=test_user.id,
                db=session,
            )
        assert exc.value.status_code == 400
        assert "must be 'confirmed'" in exc.value.detail

    def test_qr_code_mismatch(
        self, session, test_user, test_reservation, test_charger_ccs
    ):
        """QR kod (charger_id) reservation'daki charger ile eslesmiyor → 400.
        REQ 1.21: QR kod dogrulamasi."""
        wrong_qr_code = test_charger_ccs.id + 999

        with pytest.raises(HTTPException) as exc:
            SessionService.start_session(
                reservation_id=test_reservation.id,
                start_battery_level=20.0,
                charger_qr_code=wrong_qr_code,
                user_id=test_user.id,
                db=session,
            )
        assert exc.value.status_code == 400
        assert "QR code does not match" in exc.value.detail

    def test_battery_level_negative(
        self, session, test_user, test_reservation, test_charger_ccs
    ):
        """Batarya seviyesi < 0 → 400."""
        with pytest.raises(HTTPException) as exc:
            SessionService.start_session(
                reservation_id=test_reservation.id,
                start_battery_level=-5.0,
                charger_qr_code=test_charger_ccs.id,
                user_id=test_user.id,
                db=session,
            )
        assert exc.value.status_code == 400
        assert "Battery level must be between 0 and 100" in exc.value.detail

    def test_battery_level_over_100(
        self, session, test_user, test_reservation, test_charger_ccs
    ):
        """Batarya seviyesi > 100 → 400."""
        with pytest.raises(HTTPException) as exc:
            SessionService.start_session(
                reservation_id=test_reservation.id,
                start_battery_level=110.0,
                charger_qr_code=test_charger_ccs.id,
                user_id=test_user.id,
                db=session,
            )
        assert exc.value.status_code == 400
        assert "Battery level must be between 0 and 100" in exc.value.detail

    def test_end_battery_lower_than_start(
        self, session, test_user, test_active_session, test_wallet
    ):
        """end_battery < start_battery → 400."""
        with pytest.raises(HTTPException) as exc:
            SessionService.complete_session(
                session_id=test_active_session.id,
                end_battery_level=10.0,  # start=20
                user_id=test_user.id,
                db=session,
            )
        assert exc.value.status_code == 400
        assert "cannot be lower than start" in exc.value.detail

    def test_complete_already_completed_session(
        self, session, test_user, test_active_session, test_wallet
    ):
        """Zaten completed olan session tekrar complete edilemez → 400."""
        # Ilk kez tamamla
        SessionService.complete_session(
            session_id=test_active_session.id,
            end_battery_level=80.0,
            user_id=test_user.id,
            db=session,
        )

        # Ikinci kez dene
        with pytest.raises(HTTPException) as exc:
            SessionService.complete_session(
                session_id=test_active_session.id,
                end_battery_level=90.0,
                user_id=test_user.id,
                db=session,
            )
        assert exc.value.status_code == 400
        assert "must be 'active'" in exc.value.detail
