#!/usr/bin/env python3
"""
Setup database using SQL files directly (bypasses Alembic permission issues)
"""
import os
from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("ERROR: DATABASE_URL not set")
    exit(1)

print("Connecting to database...")
engine = create_engine(database_url)

# Read the SQL migration file
sql_file = "/app/migrations/001_initial_schema.sql"
print(f"Reading {sql_file}...")

with open(sql_file, 'r') as f:
    sql_content = f.read()

# Split by statements (simple approach)
statements = [s.strip() for s in sql_content.split(';') if s.strip()]

print(f"Executing {len(statements)} SQL statements...")

try:
    with engine.connect() as conn:
        for i, statement in enumerate(statements, 1):
            try:
                print(f"  [{i}/{len(statements)}] Executing...")
                conn.execute(text(statement))
                conn.commit()
            except Exception as e:
                # Check if it's a "already exists" error, which is OK
                if "already exists" in str(e).lower():
                    print(f"  ⚠️  Object already exists (skipping)")
                    conn.rollback()
                else:
                    print(f"  ❌ Error: {e}")
                    conn.rollback()
                    raise
        
        print("✅ Database schema created successfully!")
        
        # Now seed achievements
        print("\nSeeding achievements...")
        from app.scripts.seed_achievements import main as seed_main
        seed_main()
        
except Exception as e:
    print(f"❌ Setup failed: {e}")
    exit(1)
