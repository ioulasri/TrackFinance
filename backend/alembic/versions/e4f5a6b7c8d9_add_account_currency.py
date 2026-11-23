"""Persist each account's currency; existing amounts and accounts are retained."""
from alembic import op
import sqlalchemy as sa

revision = "e4f5a6b7c8d9"
down_revision = "d3e4f5a6b7c8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("currency", sa.String(3), nullable=False, server_default="MAD"))


def downgrade():
    op.drop_column("users", "currency")
