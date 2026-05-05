"""
Gorev 4.2: Session Tests (Unit + Component Testing)
TC-09 ~ TC-12: Maliyet hesaplama, sifir tuketim, yetersiz bakiye, otomatik odeme.

Test edilen fonksiyonlar:
  - SessionService.complete_session()  — session_service.py
  - WalletService.deduct()             — wallet_service.py

Strateji: Boundary Value Testing + Guideline-based Testing
"""

import pytest
from fastapi import HTTPException
from sqlmodel import select

from app.services.session_service import SessionService
from app.models.wallet import Transaction


# ─── TC-09: Maliyet Hesaplama (Validation Test) ───

def test_tc09_cost_calculation(session, test_user, test_active_session, test_wallet):
    """
    TC-09: 75 kWh batarya, start=20%, end=80%, pricing=4.0 TL/kWh.
    energy = 75 * (80 - 20) / 100 = 45 kWh
    cost   = 45 * 4.0 = 180.0 TL
    REQ 1.13: Maliyet baslangic fiyatiyla hesaplanir.
    """
    result = SessionService.complete_session(
        session_id=test_active_session.id,
        end_battery_level=80.0,
        user_id=test_user.id,
        db=session,
    )

    assert result.energy_consumed == 45.0
    assert result.total_cost == 180.0
    assert result.status == "completed"
    assert result.end_battery_level == 80.0
    assert result.completed_at is not None


# ─── TC-10: Sifir Tuketim (Defect Test — Boundary Value) ───

def test_tc10_zero_consumption(session, test_user, test_active_session, test_wallet):
    """
    TC-10: start=20%, end=20% → energy=0, cost=0.
    Cuzdan kesintisi yapilMAMALI (total_cost=0).
    Boundary value: 0 kWh sinir degeri.
    """
    initial_balance = test_wallet.balance

    result = SessionService.complete_session(
        session_id=test_active_session.id,
        end_battery_level=20.0,  # start ile ayni
        user_id=test_user.id,
        db=session,
    )

    assert result.energy_consumed == 0.0
    assert result.total_cost == 0.0
    assert result.status == "completed"

    # Cuzdan bakiyesi degismemeli
    session.refresh(test_wallet)
    assert test_wallet.balance == initial_balance

    # Charge tipi transaction olmamali
    txs = list(session.exec(
        select(Transaction).where(
            Transaction.wallet_id == test_wallet.id,
            Transaction.type == "charge",
        )
    ).all())
    assert len(txs) == 0


# ─── TC-11: Yetersiz Bakiye (Defect Test) ───

def test_tc11_insufficient_balance(session, test_user, test_active_session, test_wallet_low):
    """
    TC-11: Bakiye=50 TL, maliyet=180 TL → HTTPException 400.
    REQ 4.7: Yetersiz bakiye kontrolu.
    Strateji: Guideline-based — hata mesajini tetikleyen senaryo.
    """
    with pytest.raises(HTTPException) as exc:
        SessionService.complete_session(
            session_id=test_active_session.id,
            end_battery_level=80.0,
            user_id=test_user.id,
            db=session,
        )

    assert exc.value.status_code == 400
    assert "Insufficient wallet balance" in exc.value.detail


# ─── TC-12: Otomatik Odeme (Validation Test — Component) ───

def test_tc12_auto_payment(session, test_user, test_active_session, test_wallet):
    """
    TC-12: Bakiye=500 TL, maliyet=180 TL → bakiye=320 TL.
    REQ 4.4: Sarj tamamlaninca otomatik cuzdan kesintisi.
    Transaction kaydi olusturulmali.
    """
    SessionService.complete_session(
        session_id=test_active_session.id,
        end_battery_level=80.0,
        user_id=test_user.id,
        db=session,
    )

    # Cuzdan bakiyesi kontrol
    session.refresh(test_wallet)
    assert test_wallet.balance == 320.0

    # Transaction kaydi kontrol
    txs = list(session.exec(
        select(Transaction).where(
            Transaction.wallet_id == test_wallet.id,
            Transaction.type == "charge",
        )
    ).all())
    assert len(txs) == 1
    assert txs[0].amount == -180.0
    assert txs[0].status == "completed"
    assert txs[0].session_id == test_active_session.id
