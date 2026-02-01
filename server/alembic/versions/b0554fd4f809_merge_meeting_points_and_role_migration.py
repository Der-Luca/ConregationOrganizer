"""merge meeting points and role migration

Revision ID: b0554fd4f809
Revises: add_meeting_points, migrate_role_to_roles
Create Date: 2026-02-01 19:10:21.056513

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b0554fd4f809'
down_revision = ('add_meeting_points', 'migrate_role_to_roles')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
