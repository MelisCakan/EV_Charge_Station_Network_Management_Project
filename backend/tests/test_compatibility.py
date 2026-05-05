"""
Gorev 4.1: Compatibility Tests (Unit Testing)
TC-01 ~ TC-04: Konnektor ve guc uyumluluk kontrolleri.

Test edilen fonksiyon: check_compatibility() — compatibility_service.py
Strateji: Equivalence Partitioning (CCS / CHAdeMO / Type2 partition'lari)
"""

import pytest
from fastapi import HTTPException

from app.services.compatibility_service import check_compatibility


# ─── TC-01: CCS Konnektor Uyumlulugu (Validation Test) ───

def test_tc01_compatible_ccs(session, test_vehicle_ccs, test_charger_ccs):
    """
    TC-01: CCS arac + CCS charger → uyumlu.
    REQ 7.2: Konnektor tipleri eslesmeli.
    """
    result = check_compatibility(test_vehicle_ccs.id, test_charger_ccs.id, session)

    assert result["is_compatible"] is True
    assert result["vehicle_connector"] == "CCS"
    assert result["charger_connector"] == "CCS"


# ─── TC-02: CCS ↔ CHAdeMO Uyumsuzlugu (Defect Test) ───

def test_tc02_incompatible_ccs_chademo(session, test_vehicle_ccs, test_charger_chademo):
    """
    TC-02: CCS arac + CHAdeMO charger → uyumsuz.
    REQ 7.2: Farkli konnektor tipleri reddedilmeli.
    """
    result = check_compatibility(test_vehicle_ccs.id, test_charger_chademo.id, session)

    assert result["is_compatible"] is False
    assert result["vehicle_connector"] == "CCS"
    assert result["charger_connector"] == "CHAdeMO"
    assert "uyumsuz" in result["message"].lower()


# ─── TC-03: Type2 Uyumlulugu (Validation Test) ───

def test_tc03_compatible_type2(session, test_vehicle_type2, test_charger_type2):
    """
    TC-03: Type2 arac + Type2 charger → uyumlu.
    REQ 7.2: Farkli konnektor partition'i ile validation.
    """
    result = check_compatibility(test_vehicle_type2.id, test_charger_type2.id, session)

    assert result["is_compatible"] is True
    assert result["vehicle_connector"] == "Type2"
    assert result["charger_connector"] == "Type2"


# ─── TC-04: Guc Uyumlulugu (Validation Test) ───

def test_tc04_power_compatibility(session, test_vehicle_small_battery, test_charger_ccs):
    """
    TC-04: 40 kWh batarya + 150 kW charger → uyumlu.
    Guc farki uyumlulugu bozmaz, sadece konnektor eslesmesi onemli.
    """
    result = check_compatibility(test_vehicle_small_battery.id, test_charger_ccs.id, session)

    assert result["is_compatible"] is True
    assert result["vehicle_connector"] == "CCS"
    assert result["charger_connector"] == "CCS"


# ─── Ek: 404 Edge Cases (Gorev 4.3) ───

def test_vehicle_not_found(session, test_charger_ccs):
    """Olmayan vehicle_id → 404."""
    with pytest.raises(HTTPException) as exc:
        check_compatibility(9999, test_charger_ccs.id, session)
    assert exc.value.status_code == 404
    assert "Vehicle not found" in exc.value.detail


def test_charger_not_found(session, test_vehicle_ccs):
    """Olmayan charger_id → 404."""
    with pytest.raises(HTTPException) as exc:
        check_compatibility(test_vehicle_ccs.id, 9999, session)
    assert exc.value.status_code == 404
    assert "Charger not found" in exc.value.detail
