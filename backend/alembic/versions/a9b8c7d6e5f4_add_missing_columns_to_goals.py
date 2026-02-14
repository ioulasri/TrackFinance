"""add missing columns to goals table

Revision ID: a9b8c7d6e5f4
Revises: f8a1c2e3d4b5
Create Date: 2026-02-14 01:35:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a9b8c7d6e5f4'
down_revision = 'f8a1c2e3d4b5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns if they don't exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Get existing columns
    existing_columns = [col['name'] for col in inspector.get_columns('goals')]
    
    # Add icon column if missing
    if 'icon' not in existing_columns:
        op.add_column('goals', sa.Column('icon', sa.String(length=20), nullable=False, server_default='🎯'))
    
    # Add category column if missing
    if 'category' not in existing_columns:
        op.add_column('goals', sa.Column('category', sa.String(length=50), nullable=True))
    
    # Add description column if missing
    if 'description' not in existing_columns:
        op.add_column('goals', sa.Column('description', sa.String(length=500), nullable=True))


def downgrade() -> None:
    # Remove added columns
    op.drop_column('goals', 'description')
    op.drop_column('goals', 'category')
    op.drop_column('goals', 'icon')
