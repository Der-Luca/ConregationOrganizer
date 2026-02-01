"""Migrate role string column to roles array column

Revision ID: migrate_role_to_roles
Revises: migration_add_booking_participants
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

# revision identifiers
revision = "migrate_role_to_roles"
down_revision = "add_booking_participants"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new roles column as ARRAY(String)
    op.add_column("users", sa.Column("roles", ARRAY(sa.String()), nullable=True))

    # Migrate data: convert old single role to roles array
    # "admin" -> ["admin", "publisher"], "user" -> ["publisher"]
    op.execute(
        """
        UPDATE users
        SET roles = CASE
            WHEN role = 'admin' THEN ARRAY['admin', 'publisher']
            ELSE ARRAY['publisher']
        END
        """
    )

    # Make roles non-nullable now that data is migrated
    op.alter_column("users", "roles", nullable=False)

    # Drop old role column
    op.drop_column("users", "role")


def downgrade() -> None:
    # Add back old role column
    op.add_column("users", sa.Column("role", sa.String(), nullable=True))

    # Migrate data back: if "admin" in roles -> "admin", else "user"
    op.execute(
        """
        UPDATE users
        SET role = CASE
            WHEN 'admin' = ANY(roles) THEN 'admin'
            ELSE 'user'
        END
        """
    )

    op.alter_column("users", "role", nullable=False, server_default="user")

    # Drop roles column
    op.drop_column("users", "roles")
