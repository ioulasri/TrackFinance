"""add telegram columns to users

Revision ID: a1b2c3d4e5f6
Revises: 868c299cbcee
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '868c299cbcee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('telegram_chat_id', sa.String(64), nullable=True))
    op.add_column('users', sa.Column('telegram_link_code', sa.String(16), nullable=True))
    op.add_column('users', sa.Column('telegram_link_code_expires', sa.TIMESTAMP(timezone=True), nullable=True))
    op.create_unique_constraint('uq_users_telegram_chat_id', 'users', ['telegram_chat_id'])
    op.create_index('idx_users_telegram_chat_id', 'users', ['telegram_chat_id'])
    op.create_index('idx_users_telegram_link_code', 'users', ['telegram_link_code'])


def downgrade() -> None:
    op.drop_index('idx_users_telegram_link_code', table_name='users')
    op.drop_index('idx_users_telegram_chat_id', table_name='users')
    op.drop_constraint('uq_users_telegram_chat_id', 'users', type_='unique')
    op.drop_column('users', 'telegram_link_code_expires')
    op.drop_column('users', 'telegram_link_code')
    op.drop_column('users', 'telegram_chat_id')
