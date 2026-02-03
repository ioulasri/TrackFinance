#!/usr/bin/env python3
"""
Check what tables were created after migration
"""
import os
from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL")
engine = create_engine(database_url)

print("Checking existing tables in the database...\n")

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    """))
    
    tables = [row[0] for row in result]
    
    if tables:
        print(f"Found {len(tables)} tables:")
        for table in tables:
            print(f"  - {table}")
    else:
        print("❌ No tables found in public schema!")
        print("\nThis means the migration didn't create tables.")
        print("Checking Alembic version...")
        
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        version = result.scalar()
        print(f"Current Alembic version: {version}")

print("\n" + "="*60)
print("Expected tables: users, transactions, budgets, achievements,")
print("                 achievements_users, goals")
print("="*60)
