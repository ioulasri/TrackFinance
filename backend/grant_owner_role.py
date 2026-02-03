#!/usr/bin/env python3
"""
Grant database owner privileges to fix permission issues
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

try:
    with engine.begin() as conn:
        print("\nAttempting to grant pg_database_owner role...")
        try:
            conn.execute(text('GRANT pg_database_owner TO "trackfinance-db"'))
            print("✅ Successfully granted pg_database_owner role")
        except Exception as e:
            print(f"⚠️  Could not grant pg_database_owner role: {e}")
            print("   Trying direct CREATE grant instead...")
            
        print("\nGranting CREATE permission on public schema...")
        try:
            conn.execute(text('GRANT CREATE ON SCHEMA public TO "trackfinance-db"'))
            print("✅ Successfully granted CREATE permission")
        except Exception as e:
            print(f"⚠️  Could not grant CREATE: {e}")
        
        print("\nVerifying permissions...")
        result = conn.execute(text("""
            SELECT 
                has_schema_privilege('trackfinance-db', 'public', 'CREATE') as can_create,
                has_schema_privilege('trackfinance-db', 'public', 'USAGE') as can_usage
        """))
        can_create, can_usage = result.fetchone()
        
        print(f"\nPermission Check:")
        print(f"  CREATE: {can_create}")
        print(f"  USAGE: {can_usage}")
        
        if can_create:
            print("\n✅ SUCCESS! Testing table creation...")
            try:
                conn.execute(text("CREATE TABLE __final_test (id INT)"))
                conn.execute(text("DROP TABLE __final_test"))
                print("✅ Can create tables! Database is ready.")
                print("\nYou can now run:")
                print("  alembic upgrade head")
                sys.exit(0)
            except Exception as e:
                print(f"❌ Still cannot create tables: {e}")
                sys.exit(1)
        else:
            print("\n❌ FAILED: CREATE permission is still False")
            print("\nThis requires database admin privileges.")
            print("You need to contact DigitalOcean support or upgrade to a managed database")
            print("where you have full ownership privileges.")
            sys.exit(1)
            
except Exception as e:
    print(f"\n❌ Fatal error: {e}")
    sys.exit(1)
