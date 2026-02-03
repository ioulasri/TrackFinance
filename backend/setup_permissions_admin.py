#!/usr/bin/env python3
"""
Use admin credentials to grant permissions, then run migrations
"""
import os
import sys
from sqlalchemy import create_engine, text

# Get both URLs
admin_url = os.getenv("ADMIN_DATABASE_URL")
app_url = os.getenv("DATABASE_URL")

if not admin_url:
    print("WARNING: ADMIN_DATABASE_URL not set, trying with regular user...")
    admin_url = app_url

if not app_url:
    print("ERROR: DATABASE_URL not set")
    exit(1)

print("=" * 60)
print("STEP 1: Granting permissions with admin user")
print("=" * 60)

admin_engine = create_engine(admin_url)

try:
    with admin_engine.begin() as conn:
        # Strategy 1: Try to change schema ownership
        print("Attempting to change public schema ownership...")
        try:
            conn.execute(text('ALTER SCHEMA public OWNER TO "trackfinance-db"'))
            print("✅ Successfully changed schema ownership")
        except Exception as e:
            print(f"⚠️  Could not change ownership: {str(e)[:100]}")
            print("   Trying alternative approach...")
        
        # Strategy 2: Try to grant pg_database_owner role
        print("\nAttempting to grant pg_database_owner role...")
        try:
            conn.execute(text('GRANT pg_database_owner TO "trackfinance-db"'))
            print("✅ Successfully granted pg_database_owner role")
        except Exception as e:
            print(f"⚠️  Could not grant role: {str(e)[:100]}")
            print("   Continuing with direct grants...")
        
        # Strategy 3: Direct permission grants (should work with doadmin)
        print("\nGranting CREATE permission...")
        conn.execute(text('GRANT CREATE ON SCHEMA public TO "trackfinance-db"'))
        conn.execute(text('GRANT ALL ON SCHEMA public TO "trackfinance-db"'))
        print("✅ Successfully granted CREATE permission")
        
        print("\nGranting all privileges on existing objects...")
        conn.execute(text('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "trackfinance-db"'))
        conn.execute(text('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "trackfinance-db"'))
        conn.execute(text('GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "trackfinance-db"'))
        print("✅ Granted privileges on existing objects")
        
        print("\nSetting default privileges...")
        conn.execute(text('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "trackfinance-db"'))
        conn.execute(text('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "trackfinance-db"'))
        conn.execute(text('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "trackfinance-db"'))
        print("✅ Set default privileges")
        
    print("\n" + "=" * 60)
    print("STEP 2: Verifying permissions")
    print("=" * 60)
    
    app_engine = create_engine(app_url)
    with app_engine.connect() as conn:
        result = conn.execute(text("""
            SELECT 
                has_schema_privilege('trackfinance-db', 'public', 'CREATE') as can_create,
                has_schema_privilege('trackfinance-db', 'public', 'USAGE') as can_usage
        """))
        can_create, can_usage = result.fetchone()
        
        print(f"CREATE: {can_create}")
        print(f"USAGE: {can_usage}")
        
        if can_create:
            print("\n✅ SUCCESS! Permissions are correctly set.")
            print("You can now run: alembic upgrade head")
            sys.exit(0)
        else:
            print("\n❌ Permission verification failed")
            sys.exit(1)
            
except Exception as e:
    print(f"\n❌ Error: {e}")
    sys.exit(1)
