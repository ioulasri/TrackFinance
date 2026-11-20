"""Dump/restore TrackFinance's public schema without putting passwords in argv.

From backend, configure .env first:
  SOURCE_DATABASE_URL = old DigitalOcean database URL (dump only)
  DATABASE_MIGRATION_URL = Supabase session/direct URL (restore only)

  python -m app.scripts.migrate_database dump /tmp/trackfinance.dump
  python -m app.scripts.migrate_database restore /tmp/trackfinance.dump

Restore only into a destination without application tables. Managed Supabase
schemas and roles are left intact. This preserves the Alembic revision and IDs.
"""

import argparse
import os
from pathlib import Path
import re
import subprocess
import tempfile

from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

from app.db.config import settings


def connection_env(database_url: str) -> dict:
    url = make_url(database_url)
    if url.get_backend_name() != "postgresql" or not url.host or not url.username:
        raise ValueError("A PostgreSQL connection URL with host and user is required")
    env = os.environ.copy()
    env.update({
        "PGHOST": url.host, "PGPORT": str(url.port or 5432),
        "PGDATABASE": url.database or "postgres", "PGUSER": url.username,
        "PGPASSWORD": url.password or "", "PGSSLMODE": url.query.get("sslmode", "require"),
    })
    return env


def restore_list(archive: Path) -> str:
    contents = subprocess.run(["pg_restore", "--list", str(archive)], check=True, capture_output=True, text=True).stdout
    # Supabase already owns public; restore its contents without recreating or
    # commenting on that schema. ACLs/owners are excluded by restore flags.
    return "\n".join(
        line for line in contents.splitlines()
        if not re.search(r"\s(?:SCHEMA - public|COMMENT - SCHEMA public)\s", line)
    ) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["dump", "restore"])
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    if args.action == "dump":
        source = os.getenv("SOURCE_DATABASE_URL")
        if not source:
            parser.error("Set SOURCE_DATABASE_URL in backend/.env")
        if args.archive.exists():
            parser.error("Archive already exists; choose a new path to preserve the existing backup")
        # Reserve a private file before pg_dump opens it.
        descriptor = os.open(args.archive, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(descriptor)
        subprocess.run([
            "pg_dump", "--format=custom", "--schema=public", "--no-owner", "--no-acl",
            "--file", str(args.archive),
        ], env=connection_env(source), check=True)
        print(f"Backup saved to {args.archive}. Keep it private; it contains user data.")
    else:
        target = settings.database_migration_url
        if not target:
            parser.error("Set DATABASE_MIGRATION_URL to the Supabase session/direct connection")
        if make_url(target).port == 6543:
            parser.error("Use the session/direct connection on port 5432 for restore")
        engine = create_engine(target, poolclass=NullPool)
        try:
            tables = set(inspect(engine).get_table_names(schema="public"))
        finally:
            engine.dispose()
        if tables & {"users", "transactions", "budgets", "achievements", "user_achievements", "goals", "recurring_transactions", "telegram_state", "alembic_version"}:
            parser.error("Destination already has TrackFinance tables. Restore into a fresh Supabase project before running migrations.")
        with tempfile.NamedTemporaryFile(mode="w+", suffix=".list") as listing:
            listing.write(restore_list(args.archive))
            listing.flush()
            subprocess.run([
                "pg_restore", "--no-owner", "--no-acl", "--exit-on-error", "--single-transaction",
                "--use-list", listing.name, "--dbname", make_url(target).database or "postgres", str(args.archive),
            ], env=connection_env(target), check=True)
        print("Restore complete. Now run alembic upgrade head and the Supabase setup SQL.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
