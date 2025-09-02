-- Create test database and user for testing
-- This script runs when PostgreSQL container starts

-- Create test database if it doesn't exist
SELECT 'CREATE DATABASE beautyhub_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'beautyhub_test')\gexec

-- Create test user if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'beautyhub_test') THEN

      CREATE ROLE beautyhub_test LOGIN PASSWORD 'test_password';
   END IF;
END
$do$;

-- Grant privileges to test user
GRANT ALL PRIVILEGES ON DATABASE beautyhub_test TO beautyhub_test;
GRANT ALL PRIVILEGES ON DATABASE beautyhub TO beautyhub_test;

-- Connect to test database and grant schema privileges
\c beautyhub_test;
GRANT ALL ON SCHEMA public TO beautyhub_test;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO beautyhub_test;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO beautyhub_test;

-- Connect to main database and grant schema privileges
\c beautyhub;
GRANT ALL ON SCHEMA public TO beautyhub_test;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO beautyhub_test;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO beautyhub_test;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO beautyhub_test;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO beautyhub_test;
