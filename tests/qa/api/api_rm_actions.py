"""Resource Manager actions on a disposable [QA] asset; everything it creates is removed at the end."""
import json, os, re, datetime as dt, psycopg2
import qa_db
src = open(os.path.join(os.path.dirname(__file__), "api_lead_actions.py"), encoding="utf-8").read().split("acc = {a[")[0]
ns = {"__file__": os.path.join(os.path.dirname(os.path.abspath(__file__)), "api_lead_actions.py")}; exec(src, ns)
call, check, results, CORE, ROOT = ns["call"], ns["check"], ns["results"], ns["CORE"], ns["ROOT"]

acc = {a["email"]: a for a in json.load(open(ROOT + "/.project_notes/test_accounts.json"))}
login = check("Login as resource manager", "POST", CORE + "/api/auth/login",
              {"email": "resource.manager@myorg.com", "password": acc["resource.manager@myorg.com"]["password"]})
tok = login["token"]
alex = call("POST", CORE + "/api/auth/login", {"email": "researcher.alex@myorg.com", "password": acc["researcher.alex@myorg.com"]["password"]})[1]
atok, alex_id = alex["token"], alex["userId"]
asset_id = None
start = dt.datetime(2026, 12, 14, 4, 0, tzinfo=dt.timezone.utc)
iso = lambda d: d.isoformat()

try:
    r = check("Assets: add new asset", "POST", CORE + "/api/resources",
              {"name": "[QA] Test Spectrometer", "type": "EQUIPMENT", "description": "QA asset",
               "location": "QA Lab", "maxDurationHours": 4,
               "metadata": json.dumps({"location": "QA Lab", "maxDurationHours": 4})}, tok=tok, test=lambda d: d.get("id"))
    asset_id = r["id"]
    check("Assets: appears in catalog with max session 4h", "GET", f"{CORE}/api/resources/{asset_id}", tok=tok,
          test=lambda d: d.get("maxDurationHours") == 4)
    check("Assets: EDIT name / location / max session", "PUT", f"{CORE}/api/resources/{asset_id}",
          {"name": "[QA] Test Spectrometer v2", "type": "EQUIPMENT", "description": "edited",
           "metadata": json.dumps({"location": "QA Lab 2", "maxDurationHours": 4})}, tok=tok,
          test=lambda d: d.get("name") == "[QA] Test Spectrometer v2" and d.get("location") == "QA Lab 2")
    check("SECURITY: researcher cannot edit assets", "PUT", f"{CORE}/api/resources/{asset_id}",
          {"name": "[QA] hacked", "type": "EQUIPMENT"}, tok=atok, expect=(403,))
    check("Assets: mark MAINTENANCE", "PATCH", f"{CORE}/api/resources/{asset_id}/status", {"status": "MAINTENANCE"}, tok=tok, test=lambda d: d.get("status") == "MAINTENANCE")
    check("Assets: mark AVAILABLE again", "PATCH", f"{CORE}/api/resources/{asset_id}/status", {"status": "AVAILABLE"}, tok=tok, test=lambda d: d.get("status") == "AVAILABLE")

    # Booking approval workflow (request made by a researcher)
    b1 = check("Bookings: researcher requests slot A", "POST", f"{CORE}/api/resources/{asset_id}/bookings",
               {"startTime": iso(start), "endTime": iso(start + dt.timedelta(hours=2)), "purpose": "[QA] slot A"}, tok=atok, test=lambda d: d.get("id"))
    check("Bookings: over max session (5h > 4h) rejected", "POST", f"{CORE}/api/resources/{asset_id}/bookings",
          {"startTime": iso(start + dt.timedelta(days=1)), "endTime": iso(start + dt.timedelta(days=1, hours=5)), "purpose": "[QA] too long"}, tok=atok, expect=(400,))
    check("Bookings: list requests for asset", "GET", f"{CORE}/api/resources/{asset_id}/bookings", tok=tok, test=lambda d: any(x["id"] == b1["id"] for x in d))
    check("Bookings: APPROVE request", "PATCH", f"{CORE}/api/resources/bookings/{b1['id']}/status", {"status": "APPROVED"}, tok=tok,
          test=lambda d: d.get("status") == "APPROVED")
    notes = call("GET", CORE + "/api/notifications", tok=atok)[1] or []
    ok = any("[QA]" in (n.get("message") or "") or "Test Spectrometer" in (n.get("message") or "") for n in notes[:15])
    results.append((ok, "Notifications: researcher notified of approval")); print(f"{'PASS' if ok else 'FAIL'}  Notifications: researcher notified of approval")
    b2 = check("Bookings: researcher requests slot B", "POST", f"{CORE}/api/resources/{asset_id}/bookings",
               {"startTime": iso(start + dt.timedelta(hours=3)), "endTime": iso(start + dt.timedelta(hours=4)), "purpose": "[QA] slot B"}, tok=atok, test=lambda d: d.get("id"))
    check("Bookings: REJECT request with reason", "PATCH", f"{CORE}/api/resources/bookings/{b2['id']}/status", {"status": "REJECTED", "reason": "QA reject"}, tok=tok,
          test=lambda d: d.get("status") == "REJECTED")

    # Maintenance: overlapping bookings must be auto-cancelled
    m = check("Maintenance: schedule window over slot A", "POST", CORE + "/api/resources/maintenance",
              {"resourceId": asset_id, "assetName": "[QA] Test Spectrometer v2", "category": "EQUIPMENT",
               "startDate": iso(start - dt.timedelta(hours=1)), "endDate": iso(start + dt.timedelta(hours=3)),
               "downtimeType": "Calibration", "technician": "[QA]", "status": "Scheduled", "notes": "[QA] calibration"},
              tok=tok, test=lambda d: d.get("id"))
    if m:
        after = call("GET", f"{CORE}/api/resources/{asset_id}/bookings", tok=tok)[1]
        st = next((x["status"] for x in after if x["id"] == b1["id"]), "?")
        results.append((st == "CANCELLED", "Maintenance: overlapping approved booking auto-cancelled"))
        print(f"{'PASS' if st == 'CANCELLED' else 'FAIL'}  Maintenance: overlapping approved booking auto-cancelled (status={st})")
        check("Bookings: booking inside maintenance window rejected", "POST", f"{CORE}/api/resources/{asset_id}/bookings",
              {"startTime": iso(start), "endTime": iso(start + dt.timedelta(hours=1)), "purpose": "[QA] during maintenance"}, tok=atok, expect=(400, 409))
        check("Maintenance: list schedule", "GET", CORE + "/api/resources/maintenance", tok=tok, test=lambda d: any(x["id"] == m["id"] for x in d))
        check("Maintenance: edit window", "PATCH", f"{CORE}/api/resources/maintenance/{m['id']}",
              {**m, "notes": "[QA] calibration (edited)", "endDate": iso(start + dt.timedelta(hours=2))}, tok=tok)
        check("Maintenance: delete window", "DELETE", f"{CORE}/api/resources/maintenance/{m['id']}", tok=tok)
    check("SECURITY: researcher cannot schedule maintenance", "POST", CORE + "/api/resources/maintenance",
          {"resourceId": asset_id, "assetName": "[QA] blocked", "category": "EQUIPMENT", "startDate": iso(start + dt.timedelta(days=2)),
           "endDate": iso(start + dt.timedelta(days=2, hours=1)), "downtimeType": "Calibration", "status": "Scheduled", "notes": "[QA]"}, tok=atok, expect=(403,))
    check("Notifications: list (RM inbox)", "GET", CORE + "/api/notifications", tok=tok, test=lambda d: isinstance(d, list))
finally:
    print("\n-- cleanup (database) --")
    env = dict(l.split("=", 1) for l in open(ROOT + "/backend/core-api/.env").read().splitlines() if "=" in l and not l.lstrip().startswith("#"))
    host, port, db = re.match(r"jdbc:postgresql://([^:/]+):(\d+)/([^?]+)", env["SPRING_DATASOURCE_URL"].strip()).groups()
    c = qa_db.connect(host=host, port=port, dbname=db, user=env["SPRING_DATASOURCE_USERNAME"].strip(), password=env["SPRING_DATASOURCE_PASSWORD"].strip(), sslmode="require")
    cur = c.cursor()
    for schema in ("org_myorg", "public"):
        cur.execute("select table_name from information_schema.tables where table_schema=%s and table_name in ('resources','resource_bookings','resource_maintenance')", (schema,))
        tables = {r[0] for r in cur.fetchall()}
        if "resources" not in tables: continue
        cur.execute(f"select id from {schema}.resources where name like '[QA]%%'")
        ids = [r[0] for r in cur.fetchall()]
        for rid in ids:
            if "resource_maintenance" in tables:
                cur.execute(f"select column_name from information_schema.columns where table_schema=%s and table_name='resource_maintenance'", (schema,))
                if "resource_id" in {r[0] for r in cur.fetchall()}:
                    cur.execute(f"delete from {schema}.resource_maintenance where resource_id=%s", (rid,))
            if "resource_bookings" in tables:
                cur.execute(f"delete from {schema}.resource_bookings where resource_id=%s", (rid,)); print(f"  {schema}: deleted {cur.rowcount} bookings")
            cur.execute(f"delete from {schema}.resources where id=%s", (rid,)); print(f"  {schema}: deleted asset {rid}")
        if "resource_maintenance" in tables:
            cur.execute(f"select column_name from information_schema.columns where table_schema=%s and table_name='resource_maintenance'", (schema,))
            cols = {r[0] for r in cur.fetchall()}
            if "notes" in cols:
                cur.execute(f"delete from {schema}.resource_maintenance where notes like '[QA]%%' or asset_name like '[QA]%%'"); print(f"  {schema}: deleted {cur.rowcount} QA maintenance rows")
    c.commit()
    passed = sum(1 for ok, _ in results if ok)
    print(f"\nRESULT: {passed}/{len(results)} passed")
    for ok, name in results:
        if not ok: print("  FAILED:", name)
