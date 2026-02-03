#!/usr/bin/env python3
"""
Fix database permissions - must be run with proper privileges
This script attempts multiple strategies to fix permissions
"""
import os
import sys
from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("ERROR: DATABASE_URL not set")
    exit(1)

print("Connecting to database...")
engine = create_engine(database_url)

def try_fix(conn, user, strategy_name, sql_commands):
    """Try a fix strategy"""
    print(f"\n{strategy_name}:")
    quoted_user = f'"{user}"'
    
    for sql in sql_commands:
        try:
            formatted_sql = sql.format(user=quoted_user)
            print(f"  Executing: {formatted_sql[:80]}...")
            conn.execute(text(formatted_sql))
            conn.commit()
            print(f"  ✅ Success")
        except Exception as e:
            conn.rollback()
            error_msg = str(e)
            if "must be owner" in error_msg or "permission denied" in error_msg:
                print(f"  ⚠️  Insufficient privileges: {error_msg.split('DETAIL:')[0][:100]}")
                return False
            elif "already exists" in error_msg or "already granted" in error_msg:
                print(f"  ℹ️  Already set (skipping)")
            else:
                print(f"  ❌ Error: {error_msg[:100]}")
                return False
    return True

try:
    with engine.connect() as conn:
        # Get current user
        result = conn.execute(text("SELECT current_user"))
        current_user = result.scalar()
        print(f"Current user: {current_user}")
        quoted_user = f'"{current_user}"'
        
        # Strategy 1: Try to take ownership of public schema
        success = try_fix(conn, current_user, "Strategy 1: Change schema ownership", [
            "ALTER SCHEMA public OWNER TO {user}"
        ])
        
        if not success:
            print("\n⚠️  Cannot change schema ownership (need admin privileges)")
            print("   Trying alternative grants...")
        
        # Strategy 2: Grant CREATE permission
        try_fix(conn, current_user, "Strategy 2: Grant CREATE on schema", [
            "GRANT CREATE ON SCHEMA public TO {user}",
            "GRANT USAGE ON SCHEMA public TO {user}",
            "GRANT ALL ON SCHEMA public TO {user}"
        ])
        
        # Strategy 3: Grant on existing objects
        try_fix(conn, current_user, "Strategy 3: Grant on all tables and sequences", [
            "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {user}",
            "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {user}",
            "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO {user}"
        ])
        
        # Strategy 4: Set default privileges
        try_fix(conn, current_user, "Strategy 4: Set default privileges", [
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {user}",
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {user}",
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO {user}"
        ])
        
        # Test if we can create tables now
        print("\n" + "=" * 60)
        print("TESTING TABLE CREATION:")
        print("=" * 60)
        try:
            conn.execute(text("CREATE TABLE __permission_test (id INT)"))
            conn.execute(text("DROP TABLE __permission_test"))
            conn.commit()
            print("✅ SUCCESS! Database is ready for migrations.")
            print("\nYou can now run:")
            print("  alembic upgrade head")
            sys.exit(0)
        except Exception as e:
            conn.rollback()
            print(f"❌ STILL CANNOT CREATE TABLES: {e}")
            print("\n" + "=" * 60)
            print("MANUAL FIX REQUIRED")
            print("=" * 60)
            print(f"\nYou need database admin/owner privileges.")
            print(f"Contact DigitalOcean support or use the database console to run:")
            print(f'\n  ALTER SCHEMA public OWNER TO "{current_user}";')
            print(f"\nOr if you have another superuser account, connect with it and run:")
            print(f'  GRANT CREATE ON SCHEMA public TO "{current_user}";')
            sys.exit(1)
            
except Exception as e:
    print(f"\n❌ Fatal error: {e}")
    sys.exit(1)
