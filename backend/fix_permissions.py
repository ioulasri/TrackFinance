#!/usr/bin/env python3
"""
Fix PostgreSQL permissions for DigitalOcean dev database
Run this once to grant necessary permissions
"""
import os
from sqlalchemy import create_engine, text

# Get database URL from environment
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("ERROR: DATABASE_URL environment variable not set")
    exit(1)

print(f"Connecting to database...")
engine = create_engine(database_url)

try:
    with engine.connect() as conn:
        # Get current user
        result = conn.execute(text("SELECT current_user"))
        current_user = result.scalar()
        print(f"Current user: {current_user}")
        
        # Grant permissions on public schema
        print("Granting permissions on public schema...")
        conn.execute(text(f"GRANT ALL ON SCHEMA public TO {current_user}"))
        
        # Grant permissions on all tables
        print("Granting permissions on all tables...")
        conn.execute(text(f"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {current_user}"))
        
        # Grant permissions on all sequences
        print("Granting permissions on all sequences...")
        conn.execute(text(f"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {current_user}"))
        
        # Set default privileges for future objects
        print("Setting default privileges...")
        conn.execute(text(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {current_user}"))
        conn.execute(text(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {current_user}"))
        
        conn.commit()
        print("✅ Permissions granted successfully!")
        
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
