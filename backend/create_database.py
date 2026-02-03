#!/usr/bin/env python3
"""
Check existing databases and create trackfinance if needed
"""
import os
from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("ERROR: DATABASE_URL not set")
    exit(1)

# Connect to default database first
default_url = database_url.rsplit('/', 1)[0] + '/defaultdb'
print(f"Connecting to default database...")

engine = create_engine(default_url)

with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
    # List all databases
    result = conn.execute(text("SELECT datname FROM pg_database WHERE datistemplate = false"))
    databases = [row[0] for row in result]
    
    print("\nExisting databases:")
    for db in databases:
        print(f"  - {db}")
    
    # Check if trackfinance exists
    if 'trackfinance' not in databases:
        print("\n'trackfinance' database not found. Creating it...")
        try:
            conn.execute(text('CREATE DATABASE trackfinance'))
            print("✅ Created 'trackfinance' database")
        except Exception as e:
            print(f"❌ Error creating database: {e}")
            exit(1)
    else:
        print("\n✅ 'trackfinance' database already exists")
    
print("\nDatabase is ready. You can now run:")
print("  alembic upgrade head")
