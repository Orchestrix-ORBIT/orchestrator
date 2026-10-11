"""Database connection for suite cleanup, retried because the Supabase pooler caps clients (15 in session mode)."""
import time
import psycopg2


def connect(**kwargs):
    for attempt in range(8):
        try:
            return psycopg2.connect(**kwargs)
        except psycopg2.OperationalError as e:
            if "max clients" not in str(e) or attempt == 7:
                raise
            print(f"  (database busy, retrying in {5 * (attempt + 1)}s)")
            time.sleep(5 * (attempt + 1))
