"""Initial tables - 13 tables for 16 domain classes (EER generalization)

Revision ID: 001
Revises: None
Create Date: 2026-04-26
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. USER (Generalization: EVDriver + StationOperator + SystemAdministrator) ──
    op.create_table(
        "user",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("password_hash", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("full_name", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("phone_number", sqlmodel.sql.sqltypes.AutoString, nullable=True),
        sa.Column("role", sqlmodel.sql.sqltypes.AutoString, nullable=False, server_default="driver"),
        sa.Column("assigned_region", sqlmodel.sql.sqltypes.AutoString, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_user_email", "user", ["email"], unique=True)
    op.create_index("ix_user_role", "user", ["role"])

    # ── 2. VEHICLE ──
    op.create_table(
        "vehicle",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("brand", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("model", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("battery_capacity", sa.Float, nullable=False),
        sa.Column("connector_type", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("plate_number", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_vehicle_user_id", "vehicle", ["user_id"])
    op.create_index("ix_vehicle_plate_number", "vehicle", ["plate_number"], unique=True)

    # ── 3. CHARGING_STATIONS ──
    op.create_table(
        "charging_stations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),
        sa.Column("address", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("city", sqlmodel.sql.sqltypes.AutoString, nullable=True),
        sa.Column("operating_hours", sqlmodel.sql.sqltypes.AutoString, nullable=False, server_default="09:00-18:00"),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString, nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_charging_stations_lat_lng", "charging_stations", ["latitude", "longitude"])
    op.create_index("ix_charging_stations_status", "charging_stations", ["status"])
    op.create_index("ix_charging_stations_city", "charging_stations", ["city"])

    # ���─ 4. CHARGER ─���
    op.create_table(
        "charger",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("station_id", sa.Integer, sa.ForeignKey("charging_stations.id"), nullable=False),
        sa.Column("charger_code", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("charger_type", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("power_output", sa.Float, nullable=False),
        sa.Column("connector_type", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("pricing_per_kwh", sa.Float, nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString, nullable=False, server_default="available"),
    )
    op.create_index("ix_charger_station_id", "charger", ["station_id"])
    op.create_index("ix_charger_status", "charger", ["status"])
    op.create_index("ix_charger_connector_status", "charger", ["connector_type", "status"])

    # ── 5. WALLET ──
    op.create_table(
        "wallet",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("balance", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_wallet_user_id", "wallet", ["user_id"], unique=True)

    # ── 6. RESERVATION ──
    op.create_table(
        "reservation",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("vehicle_id", sa.Integer, sa.ForeignKey("vehicle.id"), nullable=False),
        sa.Column("charger_id", sa.Integer, sa.ForeignKey("charger.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString, nullable=False, server_default="confirmed"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_reservation_user_id", "reservation", ["user_id"])
    op.create_index("ix_reservation_charger_id", "reservation", ["charger_id"])
    op.create_index("ix_reservation_charger_date_status", "reservation", ["charger_id", "date", "status"])
    op.create_index("ix_reservation_user_status", "reservation", ["user_id", "status"])

    # ── 7. CHARGING_SESSIONS ──
    op.create_table(
        "charging_sessions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("reservation_id", sa.Integer, sa.ForeignKey("reservation.id"), nullable=False),
        sa.Column("start_battery_level", sa.Float, nullable=True),
        sa.Column("end_battery_level", sa.Float, nullable=True),
        sa.Column("energy_consumed", sa.Float, nullable=True),
        sa.Column("total_cost", sa.Float, nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString, nullable=False, server_default="active"),
        sa.Column("started_at", sa.DateTime, nullable=False),
        sa.Column("completed_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_charging_sessions_reservation_id", "charging_sessions", ["reservation_id"], unique=True)
    op.create_index("ix_charging_sessions_status", "charging_sessions", ["status"])

    # ── 8. TRANSACTION ──
    op.create_table(
        "transaction",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("wallet_id", sa.Integer, sa.ForeignKey("wallet.id"), nullable=False),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("charging_sessions.id"), nullable=True),
        sa.Column("amount", sa.Float, nullable=False),
        sa.Column("type", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("timestamp", sa.DateTime, nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString, nullable=False, server_default="completed"),
    )
    op.create_index("ix_transaction_wallet_id", "transaction", ["wallet_id"])
    op.create_index("ix_transaction_session_id", "transaction", ["session_id"])
    op.create_index("ix_transaction_wallet_timestamp", "transaction", ["wallet_id", "timestamp"])

    # ── 9. DIGITAL_RECEIPTS ──
    op.create_table(
        "digital_receipts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("charging_sessions.id"), nullable=False),
        sa.Column("issued_at", sa.DateTime, nullable=False),
        sa.Column("total_amount", sa.Float, nullable=False),
        sa.Column("energy_consumed", sa.Float, nullable=False),
        sa.Column("unit_price", sa.Float, nullable=False),
    )
    op.create_index("ix_digital_receipts_session_id", "digital_receipts", ["session_id"], unique=True)

    # ���─ 10. NOTIFICATION ──
    op.create_table(
        "notification",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("message", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("type", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("sent_at", sa.DateTime, nullable=False),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
    )
    op.create_index("ix_notification_user_id", "notification", ["user_id"])
    op.create_index("ix_notification_user_read_sent", "notification", ["user_id", "is_read", "sent_at"])

    # ── 11. ISSUE_REPORTS ──
    op.create_table(
        "issue_reports",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("charger_id", sa.Integer, sa.ForeignKey("charger.id"), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("category", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString, nullable=False, server_default="open"),
        sa.Column("reported_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_issue_reports_charger_id", "issue_reports", ["charger_id"])
    op.create_index("ix_issue_reports_status_reported_at", "issue_reports", ["status", "reported_at"])

    # ── 12. MAINTENANCE_NOTES ──
    op.create_table(
        "maintenance_notes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("issue_report_id", sa.Integer, sa.ForeignKey("issue_reports.id"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("content", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_maintenance_notes_issue_report_id", "maintenance_notes", ["issue_report_id"])

    # ── 13. FAVORITE_STATIONS ──
    op.create_table(
        "favorite_stations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("station_id", sa.Integer, sa.ForeignKey("charging_stations.id"), nullable=False),
        sa.Column("added_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_favorite_stations_user_id", "favorite_stations", ["user_id"])
    op.create_unique_constraint("uq_favorite_user_station", "favorite_stations", ["user_id", "station_id"])

    # ── 14. REPORT ──
    op.create_table(
        "report",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("admin_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("type", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("date_range", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("content", sqlmodel.sql.sqltypes.AutoString, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("report")
    op.drop_table("favorite_stations")
    op.drop_table("maintenance_notes")
    op.drop_table("issue_reports")
    op.drop_table("notification")
    op.drop_table("digital_receipts")
    op.drop_table("transaction")
    op.drop_table("charging_sessions")
    op.drop_table("reservation")
    op.drop_table("wallet")
    op.drop_table("charger")
    op.drop_table("charging_stations")
    op.drop_table("vehicle")
    op.drop_table("user")
