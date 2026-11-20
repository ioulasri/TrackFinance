"""Persist Telegram state across serverless requests.

Revision ID: d3e4f5a6b7c8
Revises: b2c3d4e5f6a7
"""
from alembic import op
import sqlalchemy as sa

revision = "d3e4f5a6b7c8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "telegram_state",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
    )
    op.create_index("idx_telegram_state_expires_at", "telegram_state", ["expires_at"])
    # This table is internal to FastAPI. Supabase browser roles get no access.
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TABLE telegram_state ENABLE ROW LEVEL SECURITY")


def downgrade():
    op.drop_index("idx_telegram_state_expires_at", table_name="telegram_state")
    op.drop_table("telegram_state")
