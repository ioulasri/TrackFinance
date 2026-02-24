"""add email verification columns and set existing users as verified

Revision ID: b1c2d3e4f5a6
Revises: a9b8c7d6e5f4
Create Date: 2026-02-24 07:07:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5a6'
down_revision = 'a9b8c7d6e5f4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add email verification columns if they don't exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('users')]

    if 'is_verified' not in existing_columns:
        op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('FALSE')))

    if 'verification_token' not in existing_columns:
        op.add_column('users', sa.Column('verification_token', sa.String(255), nullable=True))

    if 'verification_token_expires' not in existing_columns:
        op.add_column('users', sa.Column('verification_token_expires', sa.TIMESTAMP(timezone=True), nullable=True))

    # Grandfather all existing users: mark them as verified
    # so the new is_verified login check doesn't lock them out.
    op.execute("UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE")


def downgrade() -> None:
    op.drop_column('users', 'verification_token_expires')
    op.drop_column('users', 'verification_token')
    op.drop_column('users', 'is_verified')
