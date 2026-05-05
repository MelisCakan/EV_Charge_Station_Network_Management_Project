"""
Gorev 4.7: Maintenance Test (System Testing / Use-case Based)
TC-13: Charger offline → otomatik iptal + iade + bildirim.

Test edilen fonksiyon: MaintenanceService.mark_charger_offline() — maintenance_service.py
Strateji: Use-case based system testing (UC3 akisi)
"""

import pytest
from fastapi import HTTPException
from sqlmodel import select

from app.services.maintenance_service import MaintenanceService
from app.models.charger import Charger
from app.models.reservation import Reservation
from app.models.notification import Notification


# ─── TC-13: Charger Offline → Otomatik Iptal + Iade ───

def test_tc13_charger_offline_bulk_cancel(
    session,
    test_operator,
    test_charger_ccs,
    test_future_reservation,
    test_future_reservation_user2,
    test_wallet,
    test_wallet_user2,
):
    """
    TC-13: Charger offline yapildiginda 2 confirmed reservation otomatik iptal edilir.
    REQ 2.4 amendment: %100 iade.
    REQ 2.11: Maintenance bildirimi gonderilir.
    """
    charger_id = test_charger_ccs.id

    result = MaintenanceService.mark_charger_offline(
        charger_id=charger_id,
        operator_user_id=test_operator.id,
        db=session,
    )

    # 1. Sonuc kontrolu
    assert result["cancelled_count"] == 2
    assert result["new_status"] == "offline"

    # 2. Charger offline olmali
    session.refresh(test_charger_ccs)
    assert test_charger_ccs.status == "offline"

    # 3. Her iki reservation cancelled olmali
    session.refresh(test_future_reservation)
    session.refresh(test_future_reservation_user2)
    assert test_future_reservation.status == "cancelled"
    assert test_future_reservation_user2.status == "cancelled"

    # 4. Maintenance bildirimleri olusturulmali
    notifications = list(session.exec(
        select(Notification).where(Notification.type == "maintenance")
    ).all())
    assert len(notifications) == 2


# ─── Ek Testler ───

def test_charger_not_found(session, test_operator):
    """Olmayan charger → 404."""
    with pytest.raises(HTTPException) as exc:
        MaintenanceService.mark_charger_offline(
            charger_id=9999,
            operator_user_id=test_operator.id,
            db=session,
        )
    assert exc.value.status_code == 404


def test_charger_already_offline(session, test_operator, test_charger_ccs):
    """Zaten offline olan charger → 400."""
    test_charger_ccs.status = "offline"
    session.add(test_charger_ccs)
    session.commit()

    with pytest.raises(HTTPException) as exc:
        MaintenanceService.mark_charger_offline(
            charger_id=test_charger_ccs.id,
            operator_user_id=test_operator.id,
            db=session,
        )
    assert exc.value.status_code == 400
    assert "already offline" in exc.value.detail


def test_mark_charger_available(session, test_operator, test_charger_ccs):
    """Offline charger'i available yap."""
    test_charger_ccs.status = "offline"
    session.add(test_charger_ccs)
    session.commit()

    result = MaintenanceService.mark_charger_available(
        charger_id=test_charger_ccs.id,
        operator_user_id=test_operator.id,
        db=session,
    )

    assert result["new_status"] == "available"
    session.refresh(test_charger_ccs)
    assert test_charger_ccs.status == "available"


def test_offline_no_reservations(session, test_operator, test_charger_ccs):
    """Reservation olmayan charger offline yapildiginda cancelled_count=0."""
    result = MaintenanceService.mark_charger_offline(
        charger_id=test_charger_ccs.id,
        operator_user_id=test_operator.id,
        db=session,
    )

    assert result["cancelled_count"] == 0
    session.refresh(test_charger_ccs)
    assert test_charger_ccs.status == "offline"
