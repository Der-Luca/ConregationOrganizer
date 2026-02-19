"""refactor carts: add gender, cart_sessions, cart_assignments, drop old booking tables

Revision ID: refactor_carts_001
Revises: b0554fd4f809
Create Date: 2026-02-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'refactor_carts_001'
down_revision = 'b0554fd4f809'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add gender column to users
    op.add_column('users', sa.Column('gender', sa.String(), nullable=True))

    # Create cart_sessions table
    op.create_table(
        'cart_sessions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('cart_id', UUID(as_uuid=True), sa.ForeignKey('carts.id'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('month', sa.String(), nullable=False),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create cart_assignments table
    op.create_table(
        'cart_assignments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', UUID(as_uuid=True), sa.ForeignKey('cart_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('is_captain', sa.Boolean(), default=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Drop old tables
    op.drop_table('booking_participants')
    op.drop_table('cart_bookings')


def downgrade() -> None:
    # Recreate old tables
    op.create_table(
        'cart_bookings',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('cart_id', UUID(as_uuid=True), sa.ForeignKey('carts.id'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('start_datetime', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_datetime', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        'booking_participants',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('booking_id', UUID(as_uuid=True), sa.ForeignKey('cart_bookings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Drop new tables
    op.drop_table('cart_assignments')
    op.drop_table('cart_sessions')

    # Remove gender column
    op.drop_column('users', 'gender')
