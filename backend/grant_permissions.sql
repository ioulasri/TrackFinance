-- Run this in the DigitalOcean Database Console
-- This grants the necessary permissions to the trackfinance-db user

-- Grant CREATE privilege on public schema
GRANT CREATE ON SCHEMA public TO "trackfinance-db";
GRANT USAGE ON SCHEMA public TO "trackfinance-db";
GRANT ALL ON SCHEMA public TO "trackfinance-db";

-- Grant permissions on all existing tables and sequences
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "trackfinance-db";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "trackfinance-db";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "trackfinance-db";

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "trackfinance-db";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "trackfinance-db";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "trackfinance-db";

-- Optionally, transfer ownership (requires superuser)
-- ALTER SCHEMA public OWNER TO "trackfinance-db";

-- Test the fix
CREATE TABLE __test_permissions (id INT);
DROP TABLE __test_permissions;

SELECT 'SUCCESS: Permissions configured correctly!' as status;
