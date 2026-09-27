"""Run the opt-in, test-owned live Core API + realtime Supabase smoke check."""

import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_URL = (
    "jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
)
EXPECTED_USER = "postgres.nqmitpyrheqqrcbkwwut"


def read_env(path: Path) -> dict[str, str]:
    values = {}
    for line in path.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main() -> None:
    core = read_env(ROOT / "backend/core-api/.env")
    realtime = read_env(ROOT / "backend/realtime-service/.env")
    for service, values in (("Core API", core), ("Realtime", realtime)):
        if values.get("SPRING_DATASOURCE_URL") != EXPECTED_URL:
            raise SystemExit(f"{service} is not configured for the expected Supabase pooler")
        if values.get("SPRING_DATASOURCE_USERNAME") != EXPECTED_USER:
            raise SystemExit(f"{service} has an unexpected database user")
        if not values.get("SPRING_DATASOURCE_PASSWORD") or not values.get("JWT_SECRET"):
            raise SystemExit(f"{service} is missing database or JWT credentials")
    for key in ("SPRING_DATASOURCE_PASSWORD", "JWT_SECRET"):
        if core[key] != realtime[key]:
            raise SystemExit(f"Core API and Realtime disagree on {key}")
    if not core.get("TENANT_BOOTSTRAP_KEY"):
        raise SystemExit("Core API needs TENANT_BOOTSTRAP_KEY for the live smoke tenant")
    if len(core.get("ENCRYPTION_SECRET_KEY", "").encode()) != 32:
        raise SystemExit("Core API needs a 32-byte ENCRYPTION_SECRET_KEY")

    for url in (
        "http://127.0.0.1:8080/api/admin/tenants",
        "http://127.0.0.1:8082/ws/info",
    ):
        for attempt in range(30):
            try:
                with urllib.request.urlopen(url, timeout=5) as response:
                    if response.status == 200:
                        break
            except urllib.error.HTTPError as error:
                if url.endswith("/api/admin/tenants") and error.code == 403:
                    break
            except (urllib.error.URLError, TimeoutError):
                pass
            if attempt == 29:
                raise SystemExit(f"Service is not ready after 60 seconds: {url}")
            time.sleep(2)

    env = os.environ.copy()
    env.update(core)
    env["LIVE_SUPABASE_SMOKE"] = "1"
    subprocess.run(
        ["npm", "run", "test:run", "--", "integration/liveSupabase.it.test.ts"],
        cwd=ROOT / "frontend/orchestrix_orbit_frontend",
        env=env,
        check=True,
    )


if __name__ == "__main__":
    main()
