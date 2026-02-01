
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic.
revision = 'add_meeting_points'
down_revision = 'add_booking_participants'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'meeting_points',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('time', sa.Time(), nullable=False),
        sa.Column('location', sa.String(), nullable=False),
        sa.Column('conductor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('outline', sa.String(), nullable=True),
        sa.Column('link', sa.String(), nullable=True),
        sa.Column('month', sa.String(), nullable=False),
        sa.Column('series_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['conductor_id'], ['users.id']),
    )

    op.create_index('ix_meeting_points_month', 'meeting_points', ['month'])
    op.create_index('ix_meeting_points_series_id', 'meeting_points', ['series_id'])


def downgrade():
    op.drop_index('ix_meeting_points_series_id', table_name='meeting_points')
    op.drop_index('ix_meeting_points_month', table_name='meeting_points')
    op.drop_table('meeting_points')
