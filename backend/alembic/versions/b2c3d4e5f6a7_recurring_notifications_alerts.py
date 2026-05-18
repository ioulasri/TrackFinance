"""recurring transactions, telegram notification prefs, budget alert state

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-18 03:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
	# ── users: notification preferences + digest tracking ────────────
	op.add_column(
		'users',
		sa.Column('telegram_notifications_enabled', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')),
	)
	op.add_column(
		'users',
		sa.Column('last_weekly_digest_at', sa.TIMESTAMP(timezone=True), nullable=True),
	)

	# ── budgets: alert threshold tracking (0, 80, 100) ───────────────
	op.add_column(
		'budgets',
		sa.Column('last_alert_threshold', sa.Integer(), nullable=False, server_default='0'),
	)

	# ── recurring_transactions ──────────────────────────────────────
	op.create_table(
		'recurring_transactions',
		sa.Column('id', sa.Integer(), primary_key=True),
		sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
		sa.Column('amount', sa.DECIMAL(10, 2), nullable=False),
		sa.Column('type', sa.String(20), nullable=False),  # 'income' | 'expense'
		sa.Column('category', sa.String(50), nullable=False),
		sa.Column('description', sa.String(255), nullable=True),
		sa.Column('frequency', sa.String(20), nullable=False, server_default='monthly'),
		sa.Column('day_of_month', sa.Integer(), nullable=False),  # 1..31 (clamped to month length)
		sa.Column('next_run_date', sa.TIMESTAMP(timezone=True), nullable=False),
		sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')),
		sa.Column('last_run_at', sa.TIMESTAMP(timezone=True), nullable=True),
		sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
		sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
		sa.CheckConstraint('amount > 0', name='ck_recurring_amount_positive'),
		sa.CheckConstraint("type IN ('income', 'expense')", name='ck_recurring_type'),
		sa.CheckConstraint('day_of_month BETWEEN 1 AND 31', name='ck_recurring_day_of_month'),
	)
	op.create_index('idx_recurring_user', 'recurring_transactions', ['user_id'])
	op.create_index('idx_recurring_next_run', 'recurring_transactions', ['next_run_date', 'is_active'])


def downgrade() -> None:
	op.drop_index('idx_recurring_next_run', table_name='recurring_transactions')
	op.drop_index('idx_recurring_user', table_name='recurring_transactions')
	op.drop_table('recurring_transactions')
	op.drop_column('budgets', 'last_alert_threshold')
	op.drop_column('users', 'last_weekly_digest_at')
	op.drop_column('users', 'telegram_notifications_enabled')
