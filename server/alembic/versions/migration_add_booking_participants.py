
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic.
revision = 'add_booking_participants'
down_revision = None  # Replace with your current head revision
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create booking_participants table
    op.create_table(
        'booking_participants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['booking_id'], ['cart_bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )
    
    # 2. Create indexes for better query performance
    op.create_index('ix_booking_participants_booking_id', 'booking_participants', ['booking_id'])
    op.create_index('ix_booking_participants_user_id', 'booking_participants', ['user_id'])
    
    # 3. Migrate existing data: copy user_id from cart_bookings to booking_participants
    op.execute("""
        INSERT INTO booking_participants (id, booking_id, user_id, created_at)
        SELECT 
            gen_random_uuid(),
            id,
            user_id,
            created_at
        FROM cart_bookings
        WHERE user_id IS NOT NULL
    """)
    
    # 4. Make user_id nullable (keep for backward compatibility, will remove in future)
    op.alter_column('cart_bookings', 'user_id',
                    existing_type=postgresql.UUID(),
                    nullable=True)


def downgrade():
    # Restore user_id as not nullable
    op.alter_column('cart_bookings', 'user_id',
                    existing_type=postgresql.UUID(),
                    nullable=False)
    
    # Drop indexes
    op.drop_index('ix_booking_participants_user_id', table_name='booking_participants')
    op.drop_index('ix_booking_participants_booking_id', table_name='booking_participants')
    
    # Drop table
    op.drop_table('booking_participants')
