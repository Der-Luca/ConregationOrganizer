from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "763846fa8eca"
down_revision = "refactor_carts_001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("gender", sa.String(), nullable=True)
    )


def downgrade():
    op.drop_column("users", "gender")
