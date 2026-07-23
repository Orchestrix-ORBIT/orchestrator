CREATE SCHEMA IF NOT EXISTS public; 

CREATE ROLE orchestrix_app WITH LOGIN PASSWORD '${DB_PASSWORD}'; -- Created a new user for spring boot backend since root user should be available as an administrator

--giving previllege to the backend user
GRANT CONNECT ON DATABASE orchestrator_db TO orchestrix_app; -- Allows the user to connect to the database
GRANT USAGE ON SCHEMA public TO orchestrix_app;
GRANT CREATE ON SCHEMA public TO orchestrix_app; -- Allows the user to create tables in the database
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO orchestrix_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO orchestrix_app;

GRANT CREATE ON DATABASE orchestrator_db TO orchestrix_app; -- Allows the user to create schemas in the database

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO orchestrix_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO orchestrix_app;


