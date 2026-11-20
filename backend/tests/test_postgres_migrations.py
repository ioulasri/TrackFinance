"""Optional integration check against a disposable PostgreSQL server.

Set TEST_POSTGRES_ADMIN_URL to a connection with CREATEDB privileges. This test
creates and removes two uniquely named databases; it never uses DATABASE_URL.
"""

import os
from pathlib import Path
import subprocess
import sys
import uuid

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool


@pytest.mark.skipif(not os.getenv("TEST_POSTGRES_ADMIN_URL"), reason="Requires a disposable PostgreSQL server")
def test_fresh_database_and_existing_database_import(tmp_path):
    admin_url = make_url(os.environ["TEST_POSTGRES_ADMIN_URL"])
    admin = create_engine(admin_url, isolation_level="AUTOCOMMIT", poolclass=NullPool)
    suffix = uuid.uuid4().hex[:12]
    names = [f"trackfinance_test_{suffix}_{number}" for number in (1, 2)]
    backend = Path(__file__).resolve().parents[1]
    source_url, target_url = [admin_url.set(database=name).render_as_string(hide_password=False) for name in names]
    env = dict(os.environ, TESTING="1", DATABASE_URL=source_url, DATABASE_MIGRATION_URL=source_url, DEBUG="false")
    created = []

    def run(*args, command_env=None):
        result = subprocess.run(
            [sys.executable, *args], cwd=backend, env=command_env or env,
            capture_output=True, text=True,
        )
        assert result.returncode == 0, result.stdout + result.stderr

    try:
        with admin.connect() as conn:
            for name in names:
                conn.execute(text(f'CREATE DATABASE "{name}"'))
                created.append(name)
        run("-m", "alembic", "upgrade", "head")
        run("-m", "app.scripts.seed_achievements")
        source = create_engine(source_url, poolclass=NullPool)
        try:
            with source.begin() as conn:
                assert "telegram_state" in inspect(conn).get_table_names()
                assert conn.execute(text("select count(*) from achievements")).scalar() > 0
                conn.execute(text("insert into users (email, username, hashed_password) values ('migration@example.com', 'migration', 'preserved-hash')"))
            # The previous deployment has all finance tables but no Telegram-state table.
            run("-m", "alembic", "downgrade", "b2c3d4e5f6a7")
            archive = str(tmp_path / "trackfinance.dump")
            run("-m", "app.scripts.migrate_database", "dump", archive, command_env=dict(env, SOURCE_DATABASE_URL=source_url))
            restored_env = dict(env, DATABASE_URL=target_url, DATABASE_MIGRATION_URL=target_url)
            run("-m", "app.scripts.migrate_database", "restore", archive, command_env=restored_env)
            run("-m", "alembic", "upgrade", "head", command_env=restored_env)
            run("-m", "app.scripts.seed_achievements", command_env=restored_env)
            target = create_engine(target_url, poolclass=NullPool)
            try:
                with target.begin() as conn:
                    assert conn.execute(text("select hashed_password from users where username='migration'")).scalar() == "preserved-hash"
                    assert conn.execute(text("select version_num from alembic_version")).scalar() == "d3e4f5a6b7c8"
                    assert "telegram_state" in inspect(conn).get_table_names()
                    # Restored identity sequences must continue beyond imported IDs.
                    new_id = conn.execute(text("insert into users (email, username) values ('next@example.com', 'next') returning id")).scalar()
                    assert new_id > 1
            finally:
                target.dispose()
        finally:
            source.dispose()
    finally:
        with admin.connect() as conn:
            for name in created:
                conn.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
        admin.dispose()
