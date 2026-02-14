"""add goals table

Revision ID: f8a1c2e3d4b5
Revises: 37b99f390112
Create Date: 2026-02-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f8a1c2e3d4b5'
down_revision = '37b99f390112'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create goals table
    op.create_table(
        'goals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('icon', sa.String(length=20), nullable=False, server_default='🎯'),
        sa.Column('target_amount', sa.Float(), nullable=False),
        sa.Column('current_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('deadline', sa.Date(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    
    # Create indexes
    op.create_index('idx_goals_user_id', 'goals', ['user_id'])
    op.create_index('idx_goals_deadline', 'goals', ['deadline'])
    
    # Create trigger for updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION update_goals_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER trigger_update_goals_updated_at
        BEFORE UPDATE ON goals
        FOR EACH ROW
        EXECUTE FUNCTION update_goals_updated_at();
    """)


def downgrade() -> None:
    # Drop trigger and function
    op.execute("DROP TRIGGER IF EXISTS trigger_update_goals_updated_at ON goals")
    op.execute("DROP FUNCTION IF EXISTS update_goals_updated_at()")
    
    # Drop indexes
    op.drop_index('idx_goals_deadline', table_name='goals')
    op.drop_index('idx_goals_user_id', table_name='goals')
    
    # Drop table
    op.drop_table('goals')
