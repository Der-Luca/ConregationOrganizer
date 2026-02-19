"""add absences table

Revision ID: absences_001
Revises: audit_logs_001
Create Date: 2026-02-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = "absences_001"
down_revision = "audit_logs_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "absences",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_absences_user_id", "absences", ["user_id"])
    op.create_index("ix_absences_start_datetime", "absences", ["start_datetime"])
    op.create_index("ix_absences_end_datetime", "absences", ["end_datetime"])


def downgrade() -> None:
    op.drop_index("ix_absences_end_datetime", table_name="absences")
    op.drop_index("ix_absences_start_datetime", table_name="absences")
    op.drop_index("ix_absences_user_id", table_name="absences")
    op.drop_table("absences")
