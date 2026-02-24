"""add oauth columns to users

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-02-24 07:24:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c2d3e4f5a6b7'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add OAuth columns
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('users')]

    if 'oauth_provider' not in existing_columns:
        op.add_column('users', sa.Column('oauth_provider', sa.String(20), nullable=True))
    
    if 'oauth_id' not in existing_columns:
        op.add_column('users', sa.Column('oauth_id', sa.String(255), nullable=True))
    
    if 'avatar_url' not in existing_columns:
        op.add_column('users', sa.Column('avatar_url', sa.String(500), nullable=True))

    # Make hashed_password nullable (OAuth users don't have passwords)
    op.alter_column('users', 'hashed_password', nullable=True)


def downgrade() -> None:
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'oauth_id')
    op.drop_column('users', 'oauth_provider')
    op.alter_column('users', 'hashed_password', nullable=False)
