"""add current_xp to user

Revision ID: 868c299cbcee
Revises: c2d3e4f5a6b7
Create Date: 2026-02-26 21:51:23.528770

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '868c299cbcee'
down_revision: Union[str, None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('users', sa.Column('current_xp', sa.Integer(), nullable=False, server_default='0'))
    # Backfill existing users
    op.execute("UPDATE users SET current_xp = total_xp - (current_level * current_level * 100)")


def downgrade() -> None:
    op.drop_column('users', 'current_xp')