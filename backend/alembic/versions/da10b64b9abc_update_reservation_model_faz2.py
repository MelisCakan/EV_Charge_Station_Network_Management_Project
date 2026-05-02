"""update_reservation_model_faz2

Revision ID: da10b64b9abc
Revises: 001
Create Date: 2026-05-02 20:03:08.146875
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

revision: str = 'da10b64b9abc'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop and recreate reservation table (no production data)
    op.execute('DROP TABLE IF EXISTS reservation CASCADE')
    op.create_table(
        'reservation',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), sa.ForeignKey('vehicle.id'), nullable=False),
        sa.Column('station_id', sa.Integer(), sa.ForeignKey('charging_stations.id'), nullable=False),
        sa.Column('charger_id', sa.Integer(), sa.ForeignKey('charger.id'), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=False),
        sa.Column('total_cost', sa.Float(), nullable=True),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='confirmed'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_reservation_charger_status', 'reservation', ['charger_id', 'status'])
    op.create_index('ix_reservation_user_status', 'reservation', ['user_id', 'status'])

    # Fix other index/constraint changes
    op.drop_index('ix_charging_sessions_reservation_id', table_name='charging_sessions')
    op.create_unique_constraint(None, 'charging_sessions', ['reservation_id'])
    op.drop_index('ix_digital_receipts_session_id', table_name='digital_receipts')
    op.create_unique_constraint(None, 'digital_receipts', ['session_id'])
    op.drop_index('ix_vehicle_plate_number', table_name='vehicle')
    op.create_unique_constraint(None, 'vehicle', ['plate_number'])
    op.drop_index('ix_wallet_user_id', table_name='wallet')
    op.create_unique_constraint(None, 'wallet', ['user_id'])


def downgrade() -> None:
    op.drop_constraint(None, 'wallet', type_='unique')
    op.create_index('ix_wallet_user_id', 'wallet', ['user_id'], unique=True)
    op.drop_constraint(None, 'vehicle', type_='unique')
    op.create_index('ix_vehicle_plate_number', 'vehicle', ['plate_number'], unique=True)
    op.drop_constraint(None, 'digital_receipts', type_='unique')
    op.create_index('ix_digital_receipts_session_id', 'digital_receipts', ['session_id'], unique=True)
    op.drop_constraint(None, 'charging_sessions', type_='unique')
    op.create_index('ix_charging_sessions_reservation_id', 'charging_sessions', ['reservation_id'], unique=True)

    op.drop_table('reservation')
    op.create_table(
        'reservation',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), sa.ForeignKey('vehicle.id'), nullable=False),
        sa.Column('charger_id', sa.Integer(), sa.ForeignKey('charger.id'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('start_time', postgresql.TIME(), nullable=False),
        sa.Column('end_time', postgresql.TIME(), nullable=False),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='confirmed'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_reservation_charger_id', 'reservation', ['charger_id'])
    op.create_index('ix_reservation_user_id', 'reservation', ['user_id'])
    op.create_index('ix_reservation_charger_date_status', 'reservation', ['charger_id', 'date', 'status'])
