#!/usr/bin/env python3
"""
Comprehensive database permission diagnosis
"""
import os
from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("ERROR: DATABASE_URL not set")
    exit(1)

print("=" * 60)
print("DATABASE PERMISSION DIAGNOSIS")
print("=" * 60)

engine = create_engine(database_url)

with engine.connect() as conn:
    # Current user
    result = conn.execute(text("SELECT current_user, current_database()"))
    user, db = result.fetchone()
    print(f"\n1. Current Connection:")
    print(f"   User: {user}")
    print(f"   Database: {db}")
    
    # Check if user is superuser
    result = conn.execute(text(f"SELECT usesuper FROM pg_user WHERE usename = '{user}'"))
    is_super = result.scalar()
    print(f"   Superuser: {is_super}")
    
    # Public schema info
    result = conn.execute(text("""
        SELECT nspname, nspowner::regrole 
        FROM pg_namespace 
        WHERE nspname = 'public'
    """))
    schema_name, schema_owner = result.fetchone()
    print(f"\n2. Public Schema:")
    print(f"   Owner: {schema_owner}")
    
    # Check permissions on public schema
    result = conn.execute(text(f"""
        SELECT 
            has_schema_privilege('{user}', 'public', 'CREATE') as can_create,
            has_schema_privilege('{user}', 'public', 'USAGE') as can_usage
    """))
    can_create, can_usage = result.fetchone()
    print(f"\n3. Current User Permissions on Public Schema:")
    print(f"   CREATE: {can_create}")
    print(f"   USAGE: {can_usage}")
    
    # List all users with privileges on public
    result = conn.execute(text("""
        SELECT 
            grantee, 
            string_agg(privilege_type, ', ') as privileges
        FROM information_schema.schema_privileges
        WHERE schema_name = 'public'
        GROUP BY grantee
    """))
    print(f"\n4. All Grants on Public Schema:")
    for row in result:
        print(f"   {row[0]}: {row[1]}")
    
    # Check if we can create a test table
    print(f"\n5. Testing Table Creation:")
    try:
        conn.execute(text("CREATE TABLE IF NOT EXISTS __test_permissions (id INT)"))
        conn.execute(text("DROP TABLE __test_permissions"))
        conn.commit()
        print(f"   ✅ SUCCESS - Can create tables!")
    except Exception as e:
        conn.rollback()
        print(f"   ❌ FAILED - {e}")
        print(f"\n6. Required Fix:")
        print(f"   Run this SQL as database owner or admin:")
        print(f'   ALTER SCHEMA public OWNER TO "{user}";')
        print(f"   OR")
        print(f'   GRANT CREATE ON SCHEMA public TO "{user}";')

print("\n" + "=" * 60)
