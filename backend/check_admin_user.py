#!/usr/bin/env python3
"""
Check if there's an admin user we can use for migrations
"""
import os
from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("ERROR: DATABASE_URL not set")
    exit(1)

print("Checking for admin users...")
engine = create_engine(database_url)

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT usename, usesuper, usecreatedb 
        FROM pg_user 
        WHERE usename IN ('doadmin', 'postgres', 'trackfinance-db')
    """))
    
    print("\nAvailable database users:")
    for row in result:
        username, is_super, can_create_db = row
        print(f"  {username}:")
        print(f"    Superuser: {is_super}")
        print(f"    Can create DB: {can_create_db}")
    
    print("\n" + "="*60)
    print("If 'doadmin' exists and is a superuser, you can:")
    print("1. Get doadmin credentials from DigitalOcean")
    print("2. Set ADMIN_DATABASE_URL with doadmin credentials")
    print("3. Run migrations with admin user")
    print("="*60)
