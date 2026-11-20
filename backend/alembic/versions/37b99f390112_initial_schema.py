"""initial schema

Revision ID: 37b99f390112
Revises: 
Create Date: 2026-02-03 01:43:00.211929

"""
from typing import Sequence, Union
from pathlib import Path

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37b99f390112'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Originally this revision was empty because DigitalOcean used a separate
    # bootstrap SQL file. Fresh managed databases need the base tables here.
    # Already-versioned installations never rerun this revision.
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    base_tables = {"users", "transactions", "budgets", "achievements", "user_achievements"}
    if existing & base_tables:
        raise RuntimeError("Unversioned TrackFinance tables already exist. Restore the original alembic_version table before upgrading.")
    schema = Path(__file__).resolve().parents[1] / "base_schema.sql"
    op.execute(schema.read_text())


def downgrade() -> None:
    raise NotImplementedError("The original base schema cannot be downgraded automatically")
