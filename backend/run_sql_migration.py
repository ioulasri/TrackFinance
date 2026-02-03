#!/usr/bin/env python3
"""
Run the SQL migration file directly to create all tables
"""
import os
from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL")
engine = create_engine(database_url)

sql_file = "/app/migrations/001_initial_schema.sql"

print(f"Reading {sql_file}...")
with open(sql_file, 'r') as f:
    sql_content = f.read()

print("Executing SQL migration...")

with engine.begin() as conn:
    try:
        # Execute the entire SQL file
        conn.execute(text(sql_content))
        print("✅ Successfully created all tables!")
        
        # Verify tables were created
        result = conn.execute(text("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename
        """))
        
        tables = [row[0] for row in result]
        print(f"\nCreated {len(tables)} tables:")
        for table in tables:
            print(f"  - {table}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        exit(1)

print("\n✅ Database setup complete!")
print("Now run: python -m app.scripts.seed_achievements")
